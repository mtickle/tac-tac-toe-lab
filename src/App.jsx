import { useCallback, useEffect, useState } from 'react';

// A reusable Square component representing each cell on the board.
// It's purely presentational in this version.
const Square = ({ value }) => (
  <div
    className="w-24 h-24 md:w-28 md:h-28 bg-gray-800 rounded-lg flex items-center justify-center text-5xl md:text-6xl font-bold shadow-lg transition-colors duration-300"
    aria-label={`Square with value ${value || 'empty'}`}
  >
    {value === 'X' ? <span className="text-cyan-400">X</span> : <span className="text-yellow-400">{value}</span>}
  </div>
);

// Helper function to determine the winner of the game.
// Now returns an object with the winner and the winning line.
const calculateWinner = (squares) => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]              // Diagonals
  ];
  for (const line of lines) {
    const [a, b, c] = line;
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line };
    }
  }
  return null; // Return null if no winner
};

// The main App component that runs the AI vs AI simulation.
function App() {
  // State for the board, current turn, and game statistics.
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [stats, setStats] = useState({ xWins: 0, oWins: 0, draws: 0 });
  const [winningLine, setWinningLine] = useState(null);
  // State to control the simulation (playing/paused) and speed.
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(250); // Delay in ms between moves.

  // The core AI logic to find the best move for a given player.
  const findBestMove = useCallback((currentSquares, player) => {
    const opponent = player === 'X' ? 'O' : 'X';
    let move = -1;

    // 1. Check if the current player can win in the next move.
    for (let i = 0; i < currentSquares.length; i++) {
      if (!currentSquares[i]) {
        const tempSquares = [...currentSquares];
        tempSquares[i] = player;
        if (calculateWinner(tempSquares)?.winner === player) {
          return i;
        }
      }
    }

    // 2. If not, check if the opponent could win, and block them.
    for (let i = 0; i < currentSquares.length; i++) {
      if (!currentSquares[i]) {
        const tempSquares = [...currentSquares];
        tempSquares[i] = opponent;
        if (calculateWinner(tempSquares)?.winner === opponent) {
          return i;
        }
      }
    }

    // 3. If no strategic move is found, pick a random available square.
    const availableSquares = currentSquares
      .map((val, index) => (val === null ? index : null))
      .filter(val => val !== null);

    if (availableSquares.length > 0) {
      return availableSquares[Math.floor(Math.random() * availableSquares.length)];
    }

    return move; // Should not be reached in a normal game.
  }, []);

  // The main game loop, managed by useEffect.
  useEffect(() => {
    // Check for a winner or a draw.
    const gameResult = calculateWinner(squares);
    const winner = gameResult ? gameResult.winner : null;
    const isBoardFull = squares.every(square => square !== null);

    // If the game is over, update stats and reset the board for the next game.
    if (winner || isBoardFull) {
      if (gameResult) {
        setWinningLine(gameResult.line);
      }
      // Use a brief timeout to allow the final move and winning line to be seen before reset.
      setTimeout(() => {
        setStats(prevStats => ({
          xWins: winner === 'X' ? prevStats.xWins + 1 : prevStats.xWins,
          oWins: winner === 'O' ? prevStats.oWins + 1 : prevStats.oWins,
          draws: !winner && isBoardFull ? prevStats.draws + 1 : prevStats.draws,
        }));
        setWinningLine(null);
        setSquares(Array(9).fill(null));
        setIsXNext(true); // 'X' always starts the new game.
      }, speed * 1);
      return;
    }

    // If the simulation is paused, do nothing.
    if (!isPlaying) {
      return;
    }

    // Set a timeout for the next AI move.
    const timer = setTimeout(() => {
      const currentPlayer = isXNext ? 'X' : 'O';
      const move = findBestMove(squares, currentPlayer);

      if (move !== -1) {
        const newSquares = [...squares];
        newSquares[move] = currentPlayer;
        setSquares(newSquares);
        setIsXNext(!isXNext); // Switch turns.
      }
    }, speed);

    // Cleanup function to clear the timeout if the component unmounts or dependencies change.
    return () => clearTimeout(timer);

  }, [squares, isXNext, isPlaying, speed, findBestMove]);

  const totalGames = stats.xWins + stats.oWins + stats.draws;
  // Calculate percentages, handling the case where totalGames is 0.
  const xWinPercent = totalGames > 0 ? ((stats.xWins / totalGames) * 100).toFixed(0) : 0;
  const oWinPercent = totalGames > 0 ? ((stats.oWins / totalGames) * 100).toFixed(0) : 0;
  const drawPercent = totalGames > 0 ? ((stats.draws / totalGames) * 100).toFixed(0) : 0;

  // Helper to get coordinates for the winning line SVG
  const getLineCoordinates = (line) => {
    const getPercentCoords = (index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      // Calculate center coordinates as percentages
      const x = col * 33.33 + 16.66;
      const y = row * 33.33 + 16.66;
      return { x, y };
    };

    const start = getPercentCoords(line[0]);
    const end = getPercentCoords(line[2]);

    return { x1: `${start.x}%`, y1: `${start.y}%`, x2: `${end.x}%`, y2: `${end.y}%` };
  };

  const lineCoords = winningLine ? getLineCoordinates(winningLine) : null;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-gray-800/50 p-6 md:p-8 rounded-2xl shadow-2xl backdrop-blur-sm border border-gray-700 w-full max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 pb-3 text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-yellow-400">
          Noughts and Crosses AI Lab
        </h1>

        <div className="flex flex-col md:flex-row gap-8 md:gap-12 justify-center">
          {/* Left Column: Game Board */}
          <div className="relative flex justify-center items-center">
            <div className="grid grid-cols-3 gap-3">
              {squares.map((value, i) => (
                <Square key={i} value={value} />
              ))}
            </div>
            {lineCoords && (
              <svg className="absolute top-0 left-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                <line
                  x1={lineCoords.x1}
                  y1={lineCoords.y1}
                  x2={lineCoords.x2}
                  y2={lineCoords.y2}
                  className="stroke-red-500 animate-pulse"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>

          {/* Right Column: Stats and Controls */}
          <div className="flex flex-col justify-center gap-8 w-full md:w-64">
            {/* Statistics Panel */}
            <div className="w-full text-center bg-gray-900/50 p-4 rounded-lg border border-gray-700">
              <h2 className="text-2xl font-bold mb-4 text-gray-300">Statistics</h2>
              <div className="space-y-2 text-lg">
                <div className="text-cyan-400">X Wins: <span className="font-bold">{stats.xWins}</span> ({xWinPercent}%)</div>
                <div className="text-yellow-400">O Wins: <span className="font-bold">{stats.oWins}</span> ({oWinPercent}%)</div>
                <div className="text-gray-400">Draws: <span className="font-bold">{stats.draws}</span> ({drawPercent}%)</div>
              </div>
              <div className="mt-3 text-gray-500 text-sm">Total Games: {totalGames}</div>
            </div>

            {/* Controls */}
            <div className="w-full">
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-6 py-2 w-32 bg-gradient-to-r from-purple-600 to-indigo-600 font-semibold rounded-lg shadow-lg hover:from-purple-500 hover:to-indigo-500 transition-all duration-300 transform hover:scale-105"
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                {/* A higher speed value (ms) means a slower game, so "Faster" is on the left (lower value) */}
                <span>Faster</span>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <span>Slower</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

