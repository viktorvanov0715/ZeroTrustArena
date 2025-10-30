import { useEffect, useMemo, useState } from 'react';
import { useAccount, useReadContract, useWatchContractEvent } from 'wagmi';
import { Contract } from 'ethers';
import type { Abi } from 'viem';

import { Header } from './Header';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import '../styles/ArenaApp.css';

type ParsedGameState = {
  creator: string;
  opponent: string;
  started: boolean;
  round: number;
  creatorSubmitted: boolean;
  opponentSubmitted: boolean;
  creatorBalance: `0x${string}`;
  opponentBalance: `0x${string}`;
  creatorScore: `0x${string}`;
  opponentScore: `0x${string}`;
};

type DecryptedSnapshot = {
  creatorBalance: number | null;
  opponentBalance: number | null;
  creatorScore: number | null;
  opponentScore: number | null;
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function shortenAddress(value?: string) {
  if (!value || value === ZERO_ADDRESS) {
    return '—';
  }
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    const match = error.message.match(/reason="([^"]+)"/);
    if (match?.[1]) {
      return match[1];
    }
    return error.message;
  }
  return String(error);
}

export function ArenaApp() {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [stakeInput, setStakeInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [joiningGameId, setJoiningGameId] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmittingStake, setIsSubmittingStake] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedState, setDecryptedState] = useState<DecryptedSnapshot | null>(null);

  const duelAbi = CONTRACT_ABI as unknown as Abi;
  const playerArgs = address ? [address] as const : undefined;
  const gameArgs = selectedGameId !== null ? [BigInt(selectedGameId)] as const : undefined;

  const { data: openGamesRaw, refetch: refetchOpenGames } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: duelAbi,
    functionName: 'getOpenGames',
  });

  const { data: playerGamesRaw, refetch: refetchPlayerGames } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: duelAbi,
    functionName: 'getPlayerGames',
    args: playerArgs,
    query: {
      enabled: !!address,
    },
  });

  const { data: gameStateRaw, refetch: refetchGameState } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: duelAbi,
    functionName: 'getGameState',
    args: gameArgs,
    query: {
      enabled: selectedGameId !== null,
    },
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    eventName: 'GameCreated',
    onLogs: () => {
      refetchOpenGames();
      refetchPlayerGames();
    },
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    eventName: 'GameJoined',
    onLogs: () => {
      refetchOpenGames();
      refetchGameState();
      refetchPlayerGames();
    },
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    eventName: 'GameStarted',
    onLogs: () => {
      refetchGameState();
    },
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    eventName: 'RoundResolved',
    onLogs: () => {
      refetchGameState();
    },
  });

  const openGames = useMemo(() => {
    if (!openGamesRaw) {
      return [] as number[];
    }
    return (openGamesRaw as readonly bigint[]).map((value) => Number(value));
  }, [openGamesRaw]);

  const playerGames = useMemo(() => {
    if (!playerGamesRaw) {
      return [] as number[];
    }
    return (playerGamesRaw as readonly bigint[]).map((value) => Number(value));
  }, [playerGamesRaw]);

  const parsedGameState: ParsedGameState | null = useMemo(() => {
    if (!gameStateRaw || !Array.isArray(gameStateRaw)) {
      return null;
    }
    const tuple = gameStateRaw as readonly unknown[];
    const [
      creator,
      opponent,
      started,
      round,
      creatorSubmitted,
      opponentSubmitted,
      creatorBalance,
      opponentBalance,
      creatorScore,
      opponentScore,
    ] = tuple;
    return {
      creator: (creator as string) ?? ZERO_ADDRESS,
      opponent: (opponent as string) ?? ZERO_ADDRESS,
      started: Boolean(started),
      round: Number(round ?? 0),
      creatorSubmitted: Boolean(creatorSubmitted),
      opponentSubmitted: Boolean(opponentSubmitted),
      creatorBalance: (creatorBalance as `0x${string}`) ?? '0x',
      opponentBalance: (opponentBalance as `0x${string}`) ?? '0x',
      creatorScore: (creatorScore as `0x${string}`) ?? '0x',
      opponentScore: (opponentScore as `0x${string}`) ?? '0x',
    };
  }, [gameStateRaw]);

  useEffect(() => {
    if (selectedGameId !== null) {
      return;
    }
    if (playerGames.length > 0) {
      setSelectedGameId(playerGames[0]);
      return;
    }
    if (openGames.length > 0) {
      setSelectedGameId(openGames[0]);
    }
  }, [selectedGameId, playerGames, openGames]);

  useEffect(() => {
    if (!parsedGameState) {
      setDecryptedState(null);
      return;
    }
    setStakeInput('');
  }, [parsedGameState]);

  const isCreator = parsedGameState && address && parsedGameState.creator.toLowerCase() === address.toLowerCase();
  const isOpponent = parsedGameState && address && parsedGameState.opponent.toLowerCase() === address.toLowerCase();
  const isParticipant = Boolean(isCreator || isOpponent);
  const opponentPresent = parsedGameState ? parsedGameState.opponent !== ZERO_ADDRESS : false;

  const decryptedCreatorBalance = decryptedState?.creatorBalance ?? null;
  const decryptedOpponentBalance = decryptedState?.opponentBalance ?? null;
  const decryptedCreatorScore = decryptedState?.creatorScore ?? null;
  const decryptedOpponentScore = decryptedState?.opponentScore ?? null;

  const displayBalance = (() => {
    if (!decryptedState) {
      return '***';
    }
    if (isCreator && decryptedCreatorBalance !== null) {
      return decryptedCreatorBalance;
    }
    if (isOpponent && decryptedOpponentBalance !== null) {
      return decryptedOpponentBalance;
    }
    return '***';
  })();

  const formatEncryptedNumber = (value: number | null) => (value === null ? '***' : value);

  async function getContractWithSigner() {
    const signer = await signerPromise;
    if (!signer) {
      throw new Error('Connect a wallet to continue');
    }
    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }

  async function handleCreateGame() {
    try {
      setIsCreating(true);
      setStatusMessage('Creating game...');
      const contract = await getContractWithSigner();
      const tx = await contract.createGame();
      await tx.wait();
      setStatusMessage('Game created. You can invite an opponent to join.');
      await refetchOpenGames();
      await refetchPlayerGames();
    } catch (error) {
      setStatusMessage(formatError(error));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoinGame(gameId: number) {
    try {
      setJoiningGameId(gameId);
      setStatusMessage(`Joining game #${gameId}...`);
      const contract = await getContractWithSigner();
      const tx = await contract.joinGame(BigInt(gameId));
      await tx.wait();
      setStatusMessage(`Joined game #${gameId}. Ask the creator to start.`);
      await refetchOpenGames();
      await refetchPlayerGames();
      setSelectedGameId(gameId);
    } catch (error) {
      setStatusMessage(formatError(error));
    } finally {
      setJoiningGameId(null);
    }
  }

  async function handleStartGame(gameId: number) {
    try {
      setIsStarting(true);
      setStatusMessage('Starting game...');
      const contract = await getContractWithSigner();
      const tx = await contract.startGame(BigInt(gameId));
      await tx.wait();
      setStatusMessage('Game started. Both players now have 100 encrypted points.');
      await refetchGameState();
    } catch (error) {
      setStatusMessage(formatError(error));
    } finally {
      setIsStarting(false);
    }
  }

  async function handleSubmitStake() {
    if (!instance) {
      setStatusMessage('Encryption service is still loading.');
      return;
    }
    if (!address) {
      setStatusMessage('Connect a wallet to submit a stake.');
      return;
    }
    if (selectedGameId === null) {
      setStatusMessage('Select a game to participate.');
      return;
    }
    if (!parsedGameState?.started) {
      setStatusMessage('Start the game before submitting stakes.');
      return;
    }
    if (!isParticipant) {
      setStatusMessage('Only players in the game can submit stakes.');
      return;
    }

    const stakeValue = Number.parseInt(stakeInput, 10);
    if (!Number.isInteger(stakeValue) || stakeValue < 0) {
      setStatusMessage('Enter a valid non-negative integer stake.');
      return;
    }

    try {
      setIsSubmittingStake(true);
      setStatusMessage('Encrypting stake with Zama FHE...');
      const buffer = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      buffer.add32(stakeValue);
      const encrypted = await buffer.encrypt();

      const contract = await getContractWithSigner();
      const tx = await contract.submitStake(
        BigInt(selectedGameId),
        encrypted.handles[0],
        encrypted.inputProof,
      );
      setStatusMessage('Submitting stake transaction...');
      await tx.wait();
      setStatusMessage('Stake submitted. Waiting for the opponent to answer.');
      setStakeInput('');
      await refetchGameState();
    } catch (error) {
      setStatusMessage(formatError(error));
    } finally {
      setIsSubmittingStake(false);
    }
  }

  async function handleDecryptState() {
    if (!instance || !address) {
      setStatusMessage('Connect wallet and wait for encryption service.');
      return;
    }
    if (!parsedGameState) {
      setStatusMessage('Select a game to decrypt.');
      return;
    }

    try {
      setIsDecrypting(true);
      setStatusMessage('Preparing secure decryption request...');

      const decryptHandles: Array<{ handle: `0x${string}`; contractAddress: string }> = [];
      const mapping: Array<keyof DecryptedSnapshot> = [];

      if (isCreator) {
        decryptHandles.push({ handle: parsedGameState.creatorBalance, contractAddress: CONTRACT_ADDRESS });
        mapping.push('creatorBalance');
      }
      if (isOpponent) {
        decryptHandles.push({ handle: parsedGameState.opponentBalance, contractAddress: CONTRACT_ADDRESS });
        mapping.push('opponentBalance');
      }

      decryptHandles.push({ handle: parsedGameState.creatorScore, contractAddress: CONTRACT_ADDRESS });
      mapping.push('creatorScore');
      decryptHandles.push({ handle: parsedGameState.opponentScore, contractAddress: CONTRACT_ADDRESS });
      mapping.push('opponentScore');

      if (decryptHandles.length === 0) {
        setStatusMessage('No encrypted values available for this wallet.');
        return;
      }

      const keypair = instance.generateKeypair();
      const startTimestamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '7';
      const contractAddresses = [CONTRACT_ADDRESS];

      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimestamp,
        durationDays
      );

      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Connect a wallet to decrypt scores.');
      }

      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      const result = await instance.userDecrypt(
        decryptHandles,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimestamp,
        durationDays
      );

      const values = (result.values as Array<bigint>).map((value) => Number(value));
      const snapshot: DecryptedSnapshot = {
        creatorBalance: null,
        opponentBalance: null,
        creatorScore: null,
        opponentScore: null,
      };

      values.forEach((value, index) => {
        const key = mapping[index];
        snapshot[key] = value;
      });

      setDecryptedState(snapshot);
      setStatusMessage('Decryption complete.');
    } catch (error) {
      setStatusMessage(formatError(error));
    } finally {
      setIsDecrypting(false);
    }
  }

  const activeGameIdLabel = selectedGameId !== null ? `#${selectedGameId}` : '—';

  return (
    <div className="arena-app">
      <Header />
      <main className="arena-main">
        <section className="arena-hero">
          <div>
            <h2 className="arena-title">Compete with encrypted stakes</h2>
            <p className="arena-subtitle">
              Every duel starts with 100 fully homomorphic encrypted points. Submit hidden stakes,
              let the contract compare them confidentially, and climb the scoreboard without leaking
              your strategy.
            </p>
          </div>
          <div className="arena-actions">
            <button
              className="arena-button primary"
              onClick={handleCreateGame}
              disabled={!address || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Game'}
            </button>
            <button
              className="arena-button secondary"
              onClick={() => selectedGameId !== null && handleStartGame(selectedGameId)}
              disabled={!isParticipant || !parsedGameState || parsedGameState.started || !opponentPresent || isStarting}
            >
              {parsedGameState?.started ? 'Game in Progress' : isStarting ? 'Starting...' : 'Start Game'}
            </button>
          </div>
        </section>

        {(statusMessage || zamaLoading || zamaError) && (
          <div className="arena-status">
            {zamaLoading && <span>Initializing Zama relayer...</span>}
            {zamaError && <span className="error">{zamaError}</span>}
            {statusMessage && <span>{statusMessage}</span>}
          </div>
        )}

        <section className="arena-grid">
          <div className="arena-panel">
            <h3 className="panel-title">Games</h3>
            <div className="panel-section">
              <h4 className="panel-subtitle">My Games</h4>
              {playerGames.length === 0 ? (
                <p className="muted">No games yet. Create one or join an open duel.</p>
              ) : (
                <ul className="game-list">
                  {playerGames.map((gameId) => (
                    <li key={gameId}>
                      <button
                        className={`game-chip ${selectedGameId === gameId ? 'active' : ''}`}
                        onClick={() => setSelectedGameId(gameId)}
                      >
                        Game #{gameId}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="panel-section">
              <h4 className="panel-subtitle">Open Games</h4>
              {openGames.length === 0 ? (
                <p className="muted">No open games at the moment.</p>
              ) : (
                <ul className="open-list">
                  {openGames.map((gameId) => (
                    <li key={`open-${gameId}`} className="open-item">
                      <span>Game #{gameId}</span>
                      <div className="open-actions">
                        <button
                          className="arena-button ghost"
                          onClick={() => setSelectedGameId(gameId)}
                        >
                          View
                        </button>
                        <button
                          className="arena-button primary"
                          disabled={!address || joiningGameId === gameId}
                          onClick={() => handleJoinGame(gameId)}
                        >
                          {joiningGameId === gameId ? 'Joining...' : 'Join'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="arena-panel">
            <div className="panel-header">
              <h3 className="panel-title">Game Details</h3>
              <span className="panel-game-id">Game {activeGameIdLabel}</span>
            </div>

            {parsedGameState ? (
              <>
                <div className="game-meta">
                  <div>
                    <span className="meta-label">Creator</span>
                    <span className="meta-value">{shortenAddress(parsedGameState.creator)}</span>
                  </div>
                  <div>
                    <span className="meta-label">Opponent</span>
                    <span className="meta-value">
                      {opponentPresent ? shortenAddress(parsedGameState.opponent) : 'Waiting for player'}
                    </span>
                  </div>
                  <div>
                    <span className="meta-label">Status</span>
                    <span className="meta-value">
                      {parsedGameState.started ? `Round ${parsedGameState.round}` : 'Not started'}
                    </span>
                  </div>
                </div>

                <div className="scoreboard">
                  <div className="score-card">
                    <h4>Creator Score</h4>
                    <p>
                      {formatEncryptedNumber(decryptedCreatorScore)}
                    </p>
                  </div>
                  <div className="score-card">
                    <h4>Opponent Score</h4>
                    <p>
                      {formatEncryptedNumber(decryptedOpponentScore)}
                    </p>
                  </div>
                </div>

                <div className="balances">
                  <div>
                    <span className="meta-label">My Balance</span>
                    <span className="balance-value">{displayBalance}</span>
                  </div>
                  <button
                    className="arena-button ghost"
                    onClick={handleDecryptState}
                    disabled={!address || isDecrypting}
                  >
                    {isDecrypting ? 'Decrypting...' : 'Decrypt current values'}
                  </button>
                </div>

                <div className="stake-form">
                  <label htmlFor="stakeAmount">Stake for this round</label>
                  <div className="stake-input-group">
                    <input
                      id="stakeAmount"
                      type="number"
                      min={0}
                      value={stakeInput}
                      onChange={(event) => setStakeInput(event.target.value)}
                      placeholder="Enter encrypted points"
                      disabled={!isParticipant || !parsedGameState.started || isSubmittingStake}
                    />
                    <button
                      className="arena-button primary"
                      onClick={handleSubmitStake}
                      disabled={!isParticipant || !parsedGameState.started || isSubmittingStake}
                    >
                      {isSubmittingStake ? 'Submitting...' : 'Submit stake'}
                    </button>
                  </div>
                  <p className="muted">
                    Stakes remain encrypted in transit. The contract compares them privately and updates
                    balances after both submissions.
                  </p>
                </div>

                <div className="submission-status">
                  <div className={`submission-pill ${parsedGameState.creatorSubmitted ? 'ready' : ''}`}>
                    Creator {parsedGameState.creatorSubmitted ? 'ready' : 'pending'}
                  </div>
                  <div className={`submission-pill ${parsedGameState.opponentSubmitted ? 'ready' : ''}`}>
                    Opponent {parsedGameState.opponentSubmitted ? 'ready' : 'pending'}
                  </div>
                </div>
              </>
            ) : (
              <p className="muted">Select a game to view encrypted balances.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
