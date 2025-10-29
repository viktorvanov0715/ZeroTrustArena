// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypted Duel Arena
/// @notice Two-player duel game using Zama FHE encrypted points
contract EncryptedDuelGame is SepoliaConfig {
    struct Game {
        address creator;
        address opponent;
        bool started;
        uint32 round;
        euint32 creatorBalance;
        euint32 opponentBalance;
        euint32 creatorScore;
        euint32 opponentScore;
        euint32 creatorStake;
        euint32 opponentStake;
        bool creatorSubmitted;
        bool opponentSubmitted;
    }

    struct GameState {
        address creator;
        address opponent;
        bool started;
        uint32 round;
        bool creatorSubmitted;
        bool opponentSubmitted;
        euint32 creatorBalance;
        euint32 opponentBalance;
        euint32 creatorScore;
        euint32 opponentScore;
    }

    uint256 public nextGameId;
    mapping(uint256 => Game) private games;
    mapping(address => uint256[]) private gamesByPlayer;

    event GameCreated(uint256 indexed gameId, address indexed creator);
    event GameJoined(uint256 indexed gameId, address indexed opponent);
    event GameStarted(uint256 indexed gameId);
    event StakeSubmitted(uint256 indexed gameId, address indexed player, euint32 stake);
    event RoundResolved(
        uint256 indexed gameId,
        uint32 round,
        euint32 creatorBalance,
        euint32 opponentBalance,
        euint32 creatorScore,
        euint32 opponentScore
    );

    modifier gameExists(uint256 gameId) {
        require(games[gameId].creator != address(0), "Game not found");
        _;
    }

    modifier onlyParticipant(uint256 gameId) {
        Game storage game = games[gameId];
        require(msg.sender == game.creator || msg.sender == game.opponent, "Not a participant");
        _;
    }

    /// @notice Creates a new duel game waiting for an opponent
    function createGame() external returns (uint256 gameId) {
        gameId = nextGameId;
        nextGameId += 1;

        Game storage game = games[gameId];
        game.creator = msg.sender;
        game.round = 1;

        gamesByPlayer[msg.sender].push(gameId);

        emit GameCreated(gameId, msg.sender);
    }

    /// @notice Join an existing game as the second player
    function joinGame(uint256 gameId) external gameExists(gameId) {
        Game storage game = games[gameId];
        require(game.opponent == address(0), "Game already has opponent");
        require(game.creator != msg.sender, "Creator cannot join own game");

        game.opponent = msg.sender;
        gamesByPlayer[msg.sender].push(gameId);

        emit GameJoined(gameId, msg.sender);
    }

    /// @notice Start a game once both players are registered
    function startGame(uint256 gameId) external gameExists(gameId) onlyParticipant(gameId) {
        Game storage game = games[gameId];
        require(!game.started, "Game already started");
        require(game.opponent != address(0), "Waiting for opponent");

        game.started = true;

        game.creatorBalance = FHE.asEuint32(100);
        game.opponentBalance = FHE.asEuint32(100);
        game.creatorScore = FHE.asEuint32(0);
        game.opponentScore = FHE.asEuint32(0);
        game.creatorStake = FHE.asEuint32(0);
        game.opponentStake = FHE.asEuint32(0);
        game.creatorSubmitted = false;
        game.opponentSubmitted = false;

        _shareWithContract(game.creatorBalance);
        _shareWithContract(game.opponentBalance);
        _shareWithContract(game.creatorScore);
        _shareWithContract(game.opponentScore);

        _allowTo(game.creatorBalance, game.creator);
        _allowTo(game.opponentBalance, game.opponent);
        _allowTo(game.creatorScore, game.creator);
        _allowTo(game.creatorScore, game.opponent);
        _allowTo(game.opponentScore, game.creator);
        _allowTo(game.opponentScore, game.opponent);

        emit GameStarted(gameId);
    }

    /// @notice Submit an encrypted stake for the current round
    function submitStake(uint256 gameId, externalEuint32 stakeHandle, bytes calldata inputProof)
        external
        gameExists(gameId)
        onlyParticipant(gameId)
    {
        Game storage game = games[gameId];
        require(game.started, "Game not started");

        euint32 encryptedStake = FHE.fromExternal(stakeHandle, inputProof);
        _shareWithContract(encryptedStake);
        _allowTo(encryptedStake, msg.sender);

        if (msg.sender == game.creator) {
            require(!game.creatorSubmitted, "Already submitted");
            game.creatorStake = encryptedStake;
            game.creatorSubmitted = true;
        } else {
            require(!game.opponentSubmitted, "Already submitted");
            game.opponentStake = encryptedStake;
            game.opponentSubmitted = true;
        }

        emit StakeSubmitted(gameId, msg.sender, encryptedStake);

        if (game.creatorSubmitted && game.opponentSubmitted) {
            _resolveRound(gameId);
        }
    }

    /// @notice View the full game state (encrypted balances and scores)
    function getGameState(uint256 gameId) external view gameExists(gameId) returns (GameState memory) {
        Game storage game = games[gameId];
        return GameState({
            creator: game.creator,
            opponent: game.opponent,
            started: game.started,
            round: game.round,
            creatorSubmitted: game.creatorSubmitted,
            opponentSubmitted: game.opponentSubmitted,
            creatorBalance: game.creatorBalance,
            opponentBalance: game.opponentBalance,
            creatorScore: game.creatorScore,
            opponentScore: game.opponentScore
        });
    }

    /// @notice Returns games that are waiting for an opponent
    function getOpenGames() external view returns (uint256[] memory) {
        uint256 total = nextGameId;
        uint256 count;
        for (uint256 i = 0; i < total; i++) {
            Game storage game = games[i];
            if (game.creator != address(0) && game.opponent == address(0)) {
                count += 1;
            }
        }

        uint256[] memory openGames = new uint256[](count);
        uint256 index;
        for (uint256 i = 0; i < total; i++) {
            Game storage game = games[i];
            if (game.creator != address(0) && game.opponent == address(0)) {
                openGames[index] = i;
                index += 1;
            }
        }

        return openGames;
    }

    /// @notice Returns all games associated with a player address
    function getPlayerGames(address player) external view returns (uint256[] memory) {
        return gamesByPlayer[player];
    }

    function _resolveRound(uint256 gameId) private {
        Game storage game = games[gameId];

        uint32 resolvedRound = game.round;

        euint32 creatorStake = FHE.min(game.creatorStake, game.creatorBalance);
        euint32 opponentStake = FHE.min(game.opponentStake, game.opponentBalance);

        ebool creatorWins = FHE.gt(creatorStake, opponentStake);
        ebool opponentWins = FHE.gt(opponentStake, creatorStake);

        game.creatorBalance = FHE.select(
            creatorWins,
            FHE.add(game.creatorBalance, opponentStake),
            FHE.select(opponentWins, FHE.sub(game.creatorBalance, creatorStake), game.creatorBalance)
        );
        game.opponentBalance = FHE.select(
            opponentWins,
            FHE.add(game.opponentBalance, creatorStake),
            FHE.select(creatorWins, FHE.sub(game.opponentBalance, opponentStake), game.opponentBalance)
        );

        game.creatorScore = FHE.select(
            creatorWins,
            FHE.add(game.creatorScore, FHE.asEuint32(1)),
            game.creatorScore
        );
        game.opponentScore = FHE.select(
            opponentWins,
            FHE.add(game.opponentScore, FHE.asEuint32(1)),
            game.opponentScore
        );

        _shareWithContract(game.creatorBalance);
        _shareWithContract(game.opponentBalance);
        _shareWithContract(game.creatorScore);
        _shareWithContract(game.opponentScore);

        _allowTo(game.creatorBalance, game.creator);
        _allowTo(game.opponentBalance, game.opponent);
        _allowTo(game.creatorScore, game.creator);
        _allowTo(game.creatorScore, game.opponent);
        _allowTo(game.opponentScore, game.creator);
        _allowTo(game.opponentScore, game.opponent);

        game.creatorStake = FHE.asEuint32(0);
        game.opponentStake = FHE.asEuint32(0);
        game.creatorSubmitted = false;
        game.opponentSubmitted = false;
        game.round += 1;
        emit RoundResolved(gameId, resolvedRound, game.creatorBalance, game.opponentBalance, game.creatorScore, game.opponentScore);
    }

    function _shareWithContract(euint32 value) private {
        FHE.allowThis(value);
    }

    function _allowTo(euint32 value, address account) private {
        if (account != address(0)) {
            FHE.allow(value, account);
        }
    }
}
