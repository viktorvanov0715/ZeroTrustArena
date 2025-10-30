export const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';

export const CONTRACT_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'gameId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'creator',
        type: 'address',
      },
    ],
    name: 'GameCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'gameId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'opponent',
        type: 'address',
      },
    ],
    name: 'GameJoined',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'gameId',
        type: 'uint256',
      },
    ],
    name: 'GameStarted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'gameId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint32',
        name: 'round',
        type: 'uint32',
      },
      {
        indexed: false,
        internalType: 'euint32',
        name: 'creatorBalance',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'euint32',
        name: 'opponentBalance',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'euint32',
        name: 'creatorScore',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'euint32',
        name: 'opponentScore',
        type: 'bytes32',
      },
    ],
    name: 'RoundResolved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'gameId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'player',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'euint32',
        name: 'stake',
        type: 'bytes32',
      },
    ],
    name: 'StakeSubmitted',
    type: 'event',
  },
  {
    inputs: [],
    name: 'createGame',
    outputs: [
      {
        internalType: 'uint256',
        name: 'gameId',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'gameId',
        type: 'uint256',
      },
    ],
    name: 'getGameState',
    outputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'creator',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'opponent',
            type: 'address',
          },
          {
            internalType: 'bool',
            name: 'started',
            type: 'bool',
          },
          {
            internalType: 'uint32',
            name: 'round',
            type: 'uint32',
          },
          {
            internalType: 'bool',
            name: 'creatorSubmitted',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'opponentSubmitted',
            type: 'bool',
          },
          {
            internalType: 'euint32',
            name: 'creatorBalance',
            type: 'bytes32',
          },
          {
            internalType: 'euint32',
            name: 'opponentBalance',
            type: 'bytes32',
          },
          {
            internalType: 'euint32',
            name: 'creatorScore',
            type: 'bytes32',
          },
          {
            internalType: 'euint32',
            name: 'opponentScore',
            type: 'bytes32',
          },
        ],
        internalType: 'struct EncryptedDuelGame.GameState',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'gameId',
        type: 'uint256',
      },
    ],
    name: 'getPlayerGames',
    outputs: [
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getOpenGames',
    outputs: [
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nextGameId',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'gameId',
        type: 'uint256',
      },
    ],
    name: 'joinGame',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'gameId',
        type: 'uint256',
      },
    ],
    name: 'startGame',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'gameId',
        type: 'uint256',
      },
      {
        internalType: 'externalEuint32',
        name: 'stakeHandle',
        type: 'bytes32',
      },
      {
        internalType: 'bytes',
        name: 'inputProof',
        type: 'bytes',
      },
    ],
    name: 'submitStake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
