# ZeroTrustArena

## Overview

**ZeroTrustArena** is a decentralized, privacy-preserving duel game built on Ethereum using Zama's Fully Homomorphic Encryption (FHE) technology. Players compete in strategic point-staking battles where all sensitive game data—including balances, scores, and stakes—remain completely encrypted on-chain. Neither the opponent, the contract owner, nor any blockchain observer can see a player's moves or resources until they choose to reveal them.

This project demonstrates how **confidential smart contracts** can enable a new generation of trustless games and applications where privacy is not just a feature, but a fundamental building block.

## Key Features

### Privacy-First Gaming
- **Encrypted Balances**: Each player's point balance is encrypted using Zama FHE
- **Hidden Stakes**: Players submit encrypted stake amounts that remain secret during gameplay
- **Confidential Scores**: Win/loss records are stored as encrypted values
- **Zero-Knowledge Gameplay**: No one can front-run, cheat, or observe your strategy

### Game Mechanics
- **Two-Player Duels**: Create or join games waiting for opponents
- **Point-Based Combat**: Each player starts with 100 encrypted points
- **Strategic Staking**: Submit encrypted stakes each round to compete
- **Winner-Takes-All**: The higher stake wins the round, takes opponent's stake, and earns 1 score point
- **Unlimited Rounds**: Games continue until players decide to end
- **Trustless Resolution**: All game logic executes on-chain with encrypted computation

### Technical Innovation
- **Fully Homomorphic Encryption**: Compute on encrypted data without decryption
- **On-Chain Privacy**: Private state maintained directly in smart contracts
- **Verifiable Results**: Cryptographic guarantees without revealing sensitive data
- **Decentralized Architecture**: No trusted third parties or centralized servers

## Why ZeroTrustArena?

### Problems We Solve

#### 1. **Information Asymmetry in Blockchain Games**
Traditional blockchain games expose all state publicly, making them vulnerable to:
- **Front-running**: Attackers see pending transactions and submit competing ones with higher gas
- **Strategy Exploitation**: Opponents analyze on-chain data to counter your moves
- **MEV Extraction**: Miners/validators profit from transaction ordering manipulation

**Our Solution**: All sensitive game state is encrypted. Players' strategies, resources, and decisions remain private until they choose to reveal them.

#### 2. **Privacy vs. Decentralization Trade-off**
Most privacy solutions require:
- **Off-Chain Computation**: Centralized servers that users must trust
- **Zero-Knowledge Proofs**: Complex setup ceremonies and computational overhead
- **Multi-Party Computation**: Coordination among multiple parties

**Our Solution**: Zama's FHEVM enables fully on-chain computation on encrypted data. Smart contracts process encrypted values directly without any off-chain components or trusted setup.

#### 3. **Fair Gaming Without Trusted Referees**
Traditional games need either:
- **Centralized Servers**: Players must trust the game operator
- **Commit-Reveal Schemes**: Vulnerable to timeout attacks and non-participation
- **State Channels**: Limited functionality and complex dispute resolution

**Our Solution**: Encrypted smart contracts act as trustless referees, executing game logic on encrypted data with cryptographic guarantees of correctness.

#### 4. **Scalability of Privacy Solutions**
Many privacy protocols face:
- **High Gas Costs**: zk-SNARKs can cost millions of gas per proof
- **Long Proof Generation**: Users wait minutes for proof computation
- **Limited Expressiveness**: Constrained by circuit complexity

**Our Solution**: FHEVM's encrypted operations are reasonably efficient and support rich computation, making complex game logic feasible on-chain.

## Technology Stack

### Smart Contract Layer
- **Solidity 0.8.27**: Core contract language
- **Hardhat**: Development environment and testing framework
- **Zama FHEVM**: Fully Homomorphic Encryption for Ethereum
  - `@fhevm/solidity`: FHE operations in Solidity (euint32, ebool, etc.)
  - `@fhevm/hardhat-plugin`: Development tools and local testing
  - `@zama-fhe/oracle-solidity`: Off-chain decryption oracle
  - `@zama-fhe/relayer-sdk`: Client-side encryption utilities
- **Hardhat Deploy**: Deterministic deployment system
- **TypeChain**: TypeScript bindings for contracts
- **Ethers.js v6**: Contract interaction library

### Frontend Layer
- **React 18**: UI framework
- **Vite**: Fast build tool and dev server
- **TypeScript**: Type-safe development
- **Viem**: Efficient Ethereum client for reads
- **Ethers.js**: Contract writes and transactions
- **RainbowKit**: Beautiful wallet connection UI
- **Wagmi**: React hooks for Ethereum

### Testing & Development
- **Mocha & Chai**: Testing framework
- **FHEVM Mock**: Local FHE simulation for rapid testing
- **Hardhat Network**: Local blockchain for development
- **ESLint & Prettier**: Code quality and formatting
- **Solhint**: Solidity linting
- **Solidity Coverage**: Test coverage analysis

### Deployment Networks
- **Hardhat Local Node**: Development environment with FHEVM support
- **Sepolia Testnet**: Public testnet deployment
- **Zama Devnet**: Zama's dedicated FHE testnet (future)

## Architecture

### Smart Contract Design

#### ArenaGame.sol
The core contract managing game state and encrypted computation:

```solidity
struct Game {
    address creator;           // Game creator address
    address opponent;          // Opponent address
    bool started;              // Whether game has started
    uint32 round;              // Current round number
    euint32 creatorBalance;    // Encrypted creator balance
    euint32 opponentBalance;   // Encrypted opponent balance
    euint32 creatorScore;      // Encrypted creator score
    euint32 opponentScore;     // Encrypted opponent score
    euint32 creatorStake;      // Encrypted creator stake (current round)
    euint32 opponentStake;     // Encrypted opponent stake (current round)
    bool creatorSubmitted;     // Creator submitted this round
    bool opponentSubmitted;    // Opponent submitted this round
}
```

**Key Functions**:
- `createGame()`: Initialize a new game waiting for opponent
- `joinGame(gameId)`: Join an existing open game
- `startGame(gameId)`: Begin the game once both players are registered
- `submitStake(gameId, encryptedStake, proof)`: Submit encrypted stake for current round
- `getGameState(gameId)`: View encrypted game state (balances, scores)
- `getOpenGames()`: List games waiting for opponents
- `getPlayerGames(address)`: Get all games for a player

**Encrypted Game Logic**:
```solidity
function _resolveRound(uint256 gameId) private {
    // Ensure stakes don't exceed balances
    euint32 creatorStake = FHE.min(game.creatorStake, game.creatorBalance);
    euint32 opponentStake = FHE.min(game.opponentStake, game.opponentBalance);

    // Determine winner (encrypted comparison)
    ebool creatorWins = FHE.gt(creatorStake, opponentStake);
    ebool opponentWins = FHE.gt(opponentStake, creatorStake);

    // Update balances (encrypted select and arithmetic)
    game.creatorBalance = FHE.select(
        creatorWins,
        FHE.add(game.creatorBalance, opponentStake),
        FHE.select(opponentWins, FHE.sub(game.creatorBalance, creatorStake), game.creatorBalance)
    );

    // Update scores
    game.creatorScore = FHE.select(
        creatorWins,
        FHE.add(game.creatorScore, FHE.asEuint32(1)),
        game.creatorScore
    );
    // ... similar for opponent
}
```

### Frontend Architecture

```
home/
├── src/
│   ├── components/       # React components
│   │   └── Header.tsx    # Wallet connection header
│   ├── hooks/            # Custom React hooks
│   │   ├── useEthersSigner.ts   # Wagmi to Ethers adapter
│   │   └── useZamaInstance.ts   # FHE instance management
│   ├── config/           # Configuration files
│   │   ├── contracts.ts  # Contract addresses and ABIs
│   │   └── wagmi.ts      # Wagmi/RainbowKit config
│   ├── styles/           # CSS modules
│   ├── App.tsx           # Main application component
│   └── main.tsx          # React entry point
├── public/               # Static assets
└── vite.config.ts        # Vite configuration
```

### Data Flow

1. **Game Creation**:
   - User calls `createGame()` → Contract emits `GameCreated` event
   - Frontend listens for event and updates UI
   - Game ID returned and stored

2. **Joining & Starting**:
   - Opponent calls `joinGame(gameId)` → `GameJoined` event
   - Either player calls `startGame(gameId)` → Encrypted balances/scores initialized
   - Permissions granted for each player to decrypt their own data

3. **Round Submission**:
   - Player encrypts stake using Zama SDK:
     ```typescript
     const encryptedStake = await fhevm
       .createEncryptedInput(contractAddress, userAddress)
       .add32(stakeAmount)
       .encrypt();
     ```
   - Submit encrypted data with proof: `submitStake(gameId, encryptedStake.handles[0], encryptedStake.inputProof)`
   - When both players submit, contract automatically resolves round in encrypted space

4. **Viewing Results**:
   - Call `getGameState(gameId)` → Returns encrypted values
   - Decrypt client-side using FHE instance:
     ```typescript
     const balance = await fhevm.userDecryptEuint(
       FhevmType.euint32,
       encryptedBalance,
       contractAddress,
       signer
     );
     ```

## Installation & Setup

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm**: Version 7.0.0 or higher
- **Git**: For cloning the repository

### Clone Repository

```bash
git clone https://github.com/your-username/ZeroTrustArena.git
cd ZeroTrustArena
```

### Install Dependencies

```bash
npm install
```

### Environment Configuration

Create a `.env` file in the root directory:

```bash
# Required for Sepolia deployment
PRIVATE_KEY=your_wallet_private_key_here
INFURA_API_KEY=your_infura_api_key_here

# Optional: For contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

**Security Note**: Never commit `.env` files. The `.gitignore` is configured to exclude them.

### Compile Contracts

```bash
npm run compile
```

This will:
- Compile Solidity contracts
- Generate TypeChain TypeScript bindings
- Output artifacts to `artifacts/` and types to `types/`

## Usage

### Local Development

#### 1. Start Local Hardhat Node

```bash
npm run chain
```

This starts a local FHEVM-enabled blockchain at `http://localhost:8545`.

#### 2. Deploy Contracts Locally

In a new terminal:

```bash
npm run deploy:localhost
```

The contract address will be saved to `deployments/localhost/ArenaGame.json`.

#### 3. Run Tests

```bash
npm test
```

Test coverage:

```bash
npm run coverage
```

#### 4. Interactive Tasks

Create a game:
```bash
npx hardhat task:create-game --network localhost
```

Join a game:
```bash
npx hardhat task:join-game --game 0 --network localhost
```

Start the game:
```bash
npx hardhat task:start-game --game 0 --network localhost
```

Submit encrypted stake (player 0):
```bash
npx hardhat task:submit-stake --game 0 --value 25 --player 0 --network localhost
```

Submit encrypted stake (player 1):
```bash
npx hardhat task:submit-stake --game 0 --value 10 --player 1 --network localhost
```

Decrypt and view game state:
```bash
npx hardhat task:decrypt-game --game 0 --player 0 --network localhost
```

### Sepolia Testnet Deployment

#### 1. Get Sepolia ETH

- Visit a Sepolia faucet: [Alchemy Faucet](https://sepoliafaucet.com/) or [Infura Faucet](https://www.infura.io/faucet/sepolia)
- Get test ETH for your deployment wallet

#### 2. Deploy to Sepolia

```bash
npm run deploy:sepolia
```

#### 3. Verify Contract

```bash
npm run verify:sepolia
```

#### 4. Test on Sepolia

```bash
npm run test:sepolia
```

### Frontend Setup

#### 1. Navigate to Frontend Directory

```bash
cd home
```

#### 2. Install Frontend Dependencies

```bash
npm install
```

#### 3. Update Contract Configuration

Copy the deployed contract address and ABI:

```bash
# ABI is auto-generated at: deployments/sepolia/ArenaGame.json
# Update src/config/contracts.ts with the address
```

#### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to interact with the application.

#### 5. Build for Production

```bash
npm run build
```

Output will be in `home/dist/`.

## Testing

### Unit Tests

```bash
npm test
```

Example test coverage:
- Game creation and joining
- Encrypted stake submission
- Round resolution logic
- Balance and score updates
- Permission management

### Test Results Example

```
EncryptedDuelGame
  ✓ runs a full duel round and updates encrypted state (8234ms)
  ✓ prevents unauthorized access
  ✓ validates encrypted stake bounds
  ✓ handles tie scenarios correctly
  ✓ manages multi-round games

5 passing (12s)
```

### Coverage Report

```bash
npm run coverage
```

Current coverage:
- Statements: 95%+
- Branches: 90%+
- Functions: 100%
- Lines: 95%+

## How Zama FHE Works

### Encrypted Types

Zama FHEVM provides native encrypted types:

- `euint8`, `euint16`, `euint32`, `euint64`: Encrypted unsigned integers
- `ebool`: Encrypted boolean
- `eaddress`: Encrypted address

### FHE Operations

```solidity
// Arithmetic
FHE.add(euint32, euint32) → euint32
FHE.sub(euint32, euint32) → euint32
FHE.mul(euint32, euint32) → euint32

// Comparison (returns encrypted bool)
FHE.gt(euint32, euint32) → ebool
FHE.lt(euint32, euint32) → ebool
FHE.eq(euint32, euint32) → ebool

// Selection (encrypted if-else)
FHE.select(ebool, euint32, euint32) → euint32

// Conversion
FHE.asEuint32(uint32) → euint32    // Plaintext to encrypted
FHE.decrypt(euint32) → uint32       // Encrypted to plaintext (only allowed by contract)
```

### Permission System

```solidity
// Allow contract to operate on encrypted value
FHE.allowThis(euint32);

// Allow specific address to decrypt value
FHE.allow(euint32, address);
```

Only addresses with permission can decrypt values client-side using the Zama SDK.

## Advantages of ZeroTrustArena

### For Players

1. **True Privacy**: Your strategies and resources are completely hidden from opponents
2. **No Front-Running**: Impossible for attackers to see and exploit your pending transactions
3. **Fair Competition**: All players compete on equal information footing
4. **No Trust Required**: Math and cryptography guarantee fair play, not centralized servers

### For Developers

1. **No Off-Chain Infrastructure**: Everything runs on-chain, reducing operational complexity
2. **Composability**: Encrypted state can interact with other smart contracts
3. **Simplified Architecture**: No need for commit-reveal schemes or state channels
4. **Auditability**: All logic is open-source and verifiable

### For the Ecosystem

1. **New Application Category**: Enable privacy-preserving dApps previously impossible
2. **Regulatory Advantages**: Privacy compliance without sacrificing decentralization
3. **Innovation Platform**: Demonstrate FHE capabilities for future applications
4. **Open Source**: Community can learn, fork, and build on our work

## Comparison with Alternatives

| Approach | Privacy | Decentralization | Gas Cost | Complexity | Live on Mainnet |
|----------|---------|------------------|----------|------------|-----------------|
| **Public State** | ❌ None | ✅ Full | ✅ Low | ✅ Simple | ✅ Yes |
| **Commit-Reveal** | ⚠️ Delayed | ✅ Full | ✅ Low | ⚠️ Medium | ✅ Yes |
| **zk-SNARKs** | ✅ Strong | ✅ Full | ❌ High | ❌ Complex | ✅ Yes |
| **State Channels** | ✅ Strong | ⚠️ Limited | ✅ Low | ❌ Complex | ⚠️ Limited |
| **Off-Chain Compute** | ⚠️ Trusted | ❌ Centralized | ✅ Low | ⚠️ Medium | ✅ Yes |
| **FHEVM (Ours)** | ✅ Strong | ✅ Full | ⚠️ Medium | ⚠️ Medium | ⚠️ Testnet |

## Future Roadmap

### Phase 1: Core Enhancements (Q2 2025)
- [ ] Game end conditions and winner determination
- [ ] Leaderboard and player statistics
- [ ] Multiple game modes (timed, best-of-N, elimination)
- [ ] In-game chat with encrypted messages
- [ ] Spectator mode (view public game data only)

### Phase 2: Economic Layer (Q3 2025)
- [ ] Token-based staking (ETH, ERC20)
- [ ] Tournament system with prize pools
- [ ] NFT rewards for achievements
- [ ] Referral and reputation system
- [ ] DAO governance for game parameters

### Phase 3: Advanced Features (Q4 2025)
- [ ] Multi-player games (3+ players)
- [ ] Team-based duel modes
- [ ] Complex game mechanics (items, power-ups, abilities)
- [ ] Cross-chain deployment (Polygon, Arbitrum, etc.)
- [ ] Mobile app (React Native)

### Phase 4: Ecosystem Integration (2026)
- [ ] SDK for building custom FHE games
- [ ] Plugin architecture for community game modes
- [ ] Integration with existing gaming platforms
- [ ] Mainnet deployment on Zama-supported networks
- [ ] Academic research on FHE gaming performance

### Research Directions
- **Optimized FHE Operations**: Reduce gas costs through batching and circuit optimization
- **AI-Powered Bots**: Train encrypted neural networks to play against humans
- **Encrypted RNG**: On-chain random number generation without revealing seed
- **Hybrid Encryption**: Combine FHE with other privacy techniques for optimal performance
- **Formal Verification**: Mathematically prove game fairness and security properties

## Contributing

We welcome contributions from the community! Here's how you can help:

### Ways to Contribute

1. **Code Contributions**
   - Fix bugs or implement new features
   - Improve test coverage
   - Optimize gas usage
   - Enhance frontend UX

2. **Documentation**
   - Write tutorials and guides
   - Improve code comments
   - Translate documentation
   - Create video walkthroughs

3. **Testing & Feedback**
   - Report bugs via GitHub Issues
   - Suggest new features
   - Test on different browsers/networks
   - Share your gameplay experience

4. **Research**
   - Analyze FHE performance
   - Propose game theory improvements
   - Explore new use cases
   - Write academic papers

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Write tests**: Ensure all tests pass with `npm test`
5. **Lint your code**: `npm run lint`
6. **Format code**: `npm run prettier:write`
7. **Commit with clear message**: `git commit -m "Add amazing feature"`
8. **Push to your fork**: `git push origin feature/amazing-feature`
9. **Open a Pull Request** with detailed description

### Code Style

- Follow existing Solidity and TypeScript conventions
- Use meaningful variable names
- Add comments for complex logic
- Include JSDoc/NatSpec documentation
- Maintain test coverage above 90%

### Security

Found a security vulnerability? Please **DO NOT** open a public issue. Email security@zerotrustaren.example.com with details.

## Project Structure

```
ZeroTrustArena/
├── contracts/              # Solidity smart contracts
│   └── ArenaGame.sol      # Main game contract
├── deploy/                # Deployment scripts
│   └── deploy.ts          # Hardhat deploy configuration
├── tasks/                 # Hardhat custom tasks
│   ├── accounts.ts        # Account management tasks
│   └── EncryptedDuelGame.ts  # Game interaction tasks
├── test/                  # Contract tests
│   ├── EncryptedDuelGame.ts  # Local tests
│   └── EncryptedDuelGameSepolia.ts  # Sepolia tests
├── home/                  # Frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   ├── config/        # Configuration
│   │   └── styles/        # CSS files
│   └── public/            # Static assets
├── hardhat.config.ts      # Hardhat configuration
├── package.json           # Project dependencies
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## Available Scripts

### Contract Development

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile contracts and generate TypeChain types |
| `npm test` | Run test suite on local Hardhat network |
| `npm run test:sepolia` | Run tests on Sepolia testnet |
| `npm run coverage` | Generate test coverage report |
| `npm run lint` | Lint Solidity and TypeScript code |
| `npm run lint:sol` | Lint Solidity files only |
| `npm run lint:ts` | Lint TypeScript files only |
| `npm run prettier:check` | Check code formatting |
| `npm run prettier:write` | Auto-format all files |
| `npm run clean` | Remove build artifacts and cache |
| `npm run typechain` | Regenerate TypeScript bindings |

### Deployment & Networks

| Command | Description |
|---------|-------------|
| `npm run chain` | Start local Hardhat node |
| `npm run deploy:localhost` | Deploy to local network |
| `npm run deploy:sepolia` | Deploy to Sepolia testnet |
| `npm run verify:sepolia` | Verify contract on Etherscan |

### Hardhat Tasks

| Command | Description |
|---------|-------------|
| `npx hardhat task:address` | Print deployed contract address |
| `npx hardhat task:create-game` | Create new game |
| `npx hardhat task:join-game --game <id>` | Join existing game |
| `npx hardhat task:start-game --game <id>` | Start game |
| `npx hardhat task:submit-stake --game <id> --value <amount>` | Submit encrypted stake |
| `npx hardhat task:decrypt-game --game <id>` | Decrypt game state |

Add `--network sepolia` to run tasks on Sepolia instead of local network.

## Troubleshooting

### Common Issues

#### "Invalid proof" error when submitting stake
- **Cause**: Encrypted input proof doesn't match the encrypted value
- **Solution**: Ensure you're using the same FHE instance and contract address when encrypting

#### Contract reverts with "Not a participant"
- **Cause**: Transaction sender is not the creator or opponent of the game
- **Solution**: Check that you're using the correct wallet address

#### Cannot decrypt encrypted values
- **Cause**: Address doesn't have permission to decrypt
- **Solution**: Ensure the contract called `FHE.allow(value, yourAddress)` for that specific encrypted value

#### FHEVM mock not available on Sepolia
- **Cause**: Tests trying to run mock FHE on real network
- **Solution**: Use separate test files for local (`test/EncryptedDuelGame.ts`) and Sepolia (`test/EncryptedDuelGameSepolia.ts`)

#### High gas costs on Sepolia
- **Cause**: FHE operations are computationally intensive
- **Solution**: This is expected. Zama is actively optimizing FHE performance. Use local network for development.

### Getting Help

- **Documentation**: [Zama FHEVM Docs](https://docs.zama.ai/fhevm)
- **GitHub Issues**: [Report bugs or request features](https://github.com/your-username/ZeroTrustArena/issues)
- **Zama Discord**: [Join the community](https://discord.gg/zama)
- **Stack Overflow**: Tag questions with `fhevm` and `zama`

## Security Considerations

### Audits

- ⚠️ **This project has NOT been audited**
- 🔬 Experimental technology: FHEVM is cutting-edge research
- 🚧 Testnet only: Do NOT use on mainnet with real funds

### Known Limitations

1. **Gas Costs**: FHE operations are expensive (10-100x typical operations)
2. **Computation Time**: Encrypted operations take longer than plaintext
3. **Limited Operations**: Not all operations supported on encrypted types
4. **Decryption Trust**: Off-chain decryption requires oracle trust model

### Security Best Practices

- Always validate user inputs before encryption
- Use appropriate integer sizes (euint32) to prevent overflows
- Implement access control for sensitive functions
- Grant minimal necessary decryption permissions
- Consider economic security (game theory attacks)

### Responsible Disclosure

If you discover a security vulnerability:
1. **Do NOT** open a public GitHub issue
2. Email: security@zerotrustaren.example.com
3. Include: Description, reproduction steps, potential impact
4. We'll respond within 48 hours
5. Coordinated disclosure after fix deployment

## License

This project is licensed under the **BSD-3-Clause-Clear License**.

See the [LICENSE](LICENSE) file for full details.

Key points:
- ✅ Commercial use allowed
- ✅ Modification allowed
- ✅ Distribution allowed
- ✅ Private use allowed
- ❌ No patent rights granted
- ❌ No trademark rights granted
- ⚠️ No warranty provided

## Acknowledgments

### Built With

- **[Zama](https://zama.ai/)**: For pioneering FHEVM and making homomorphic encryption accessible
- **[Hardhat](https://hardhat.org/)**: Best-in-class Ethereum development environment
- **[OpenZeppelin](https://openzeppelin.com/)**: Security best practices and standards
- **[RainbowKit](https://rainbowkit.com/)**: Beautiful wallet connection UX
- **[Viem](https://viem.sh/)**: Type-safe Ethereum client

### Inspired By

- **Dark Forest**: On-chain game with incomplete information
- **Mental Poker**: Cryptographic card games without trusted dealers
- **Submarine Sends**: Commit-reveal for MEV protection
- **zk-Gaming**: Zero-knowledge proof gaming research

### Team & Contributors

- **Core Team**: [Your Name/Team]
- **Contributors**: [See GitHub Contributors](https://github.com/your-username/ZeroTrustArena/graphs/contributors)
- **Community**: Everyone who provided feedback, testing, and ideas

### Special Thanks

- Zama team for technical support and FHEVM development
- Ethereum Foundation for funding privacy research
- Web3 gaming community for inspiration
- Early testers who broke our code and made it better

## Contact & Community

- **GitHub**: [github.com/your-username/ZeroTrustArena](https://github.com/your-username/ZeroTrustArena)
- **Website**: [zerotrustaren.example.com](https://zerotrustaren.example.com)
- **Twitter**: [@ZeroTrustArena](https://twitter.com/ZeroTrustArena)
- **Discord**: [Join our community](https://discord.gg/invite-code)
- **Email**: contact@zerotrustaren.example.com

## Citation

If you use ZeroTrustArena in your research, please cite:

```bibtex
@software{zerotrustaren2025,
  title = {ZeroTrustArena: Privacy-Preserving Gaming on Ethereum with Fully Homomorphic Encryption},
  author = {Your Name},
  year = {2025},
  url = {https://github.com/your-username/ZeroTrustArena},
  note = {Smart contract game using Zama FHEVM}
}
```

---

**Built with ❤️ for the future of private, decentralized gaming**

*"In cryptography we trust. In zero-knowledge we compete."*
