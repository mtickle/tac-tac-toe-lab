import { useCallback, useEffect, useState } from 'react';

// --- Database Utility Functions ---
async function saveThingsToDatabase(endpoint, data) {
  let apiUrl = 'https://game-api-zjod.onrender.com/api/' + endpoint;
  // let apiUrl = 'http://localhost:3001/api/' + endpoint; 
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to save game batch');
    return await response.json();
  } catch (err) {
    console.error('Error saving game batch:', err.message || err);
  }
}

async function loadThingsFromDatabase(endpoint, ...params) {
  try {
    const apiUrl = `https://game-api-zjod.onrender.com/api/${endpoint}/${params.join('/')}`;
    // const apiUrl = `http://localhost:3001/api/${endpoint}/${params.join('/')}`;
    const response = await fetch(apiUrl, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error loading data from database:', error);
    return null;
  }
}
// --- End of Database Utility Functions ---

// --- UI Components ---
const Square = ({ value }) => (
  <div
    className="w-24 h-24 md:w-28 md:h-28 bg-gray-800 rounded-lg flex items-center justify-center text-5xl md:text-6xl font-bold shadow-lg transition-colors duration-300"
  >
    {value === 'X' ? <span className="text-cyan-400">X</span> : <span className="text-yellow-400">{value}</span>}
  </div>
);

const MiniSquare = ({ value }) => (
  <div className="w-5 h-5 bg-gray-700 rounded-sm flex items-center justify-center text-xs font-bold">
    {value === 'X' ? <span className="text-cyan-500">X</span> : <span className="text-yellow-500">{value}</span>}
  </div>
);

const MiniBoard = ({ finalBoardState }) => (
  <div className="grid grid-cols-3 gap-0.5">
    {(finalBoardState || []).map((square, i) => <MiniSquare key={i} value={square} />)}
  </div>
);
// --- End of UI Components ---


// Helper function to determine the winner of the game.
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
  return null;
};

// The main App component that runs the AI vs AI simulation.
function App() {
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [stats, setStats] = useState({ xWins: 0, oWins: 0, draws: 0 });
  const [winningLine, setWinningLine] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameResultsBatch, setGameResultsBatch] = useState([]);
  const [gameHistory, setGameHistory] = useState([]);

  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(250);

  // Memoized function to fetch history data from the database.
  const fetchHistory = useCallback(async () => {
    console.log("Refreshing game history...");
    const historyData = await loadThingsFromDatabase('getTicTacToeGames');
    if (historyData) {
      setGameHistory(historyData);
    }
  }, []);

  // Effect to fetch history on initial load and then periodically.
  useEffect(() => {
    fetchHistory(); // Fetch on initial component mount.
    const interval = setInterval(fetchHistory, 30000); // Auto-refresh every 30 seconds.
    return () => clearInterval(interval); // Cleanup interval on component unmount.
  }, [fetchHistory]);

  const findBestMove = useCallback((currentSquares, player) => {
    const opponent = player === 'X' ? 'O' : 'X';

    // 1. Win if possible
    for (let i = 0; i < 9; i++) {
      if (!currentSquares[i]) {
        const tempSquares = [...currentSquares];
        tempSquares[i] = player;
        if (calculateWinner(tempSquares)?.winner === player) return i;
      }
    }

    // 2. Block if necessary
    for (let i = 0; i < 9; i++) {
      if (!currentSquares[i]) {
        const tempSquares = [...currentSquares];
        tempSquares[i] = opponent;
        if (calculateWinner(tempSquares)?.winner === opponent) return i;
      }
    }

    // 3. Move randomly
    const availableSquares = currentSquares
      .map((val, index) => (val === null ? index : null))
      .filter(val => val !== null);

    if (availableSquares.length > 0) {
      return availableSquares[Math.floor(Math.random() * availableSquares.length)];
    }

    return -1;
  }, []);

  // Effect for handling the game result and batching data.
  useEffect(() => {
    const gameResult = calculateWinner(squares);
    const winner = gameResult ? gameResult.winner : null;
    const isBoardFull = squares.every(square => square !== null);

    if ((winner || isBoardFull) && moveHistory.length > 0) {
      const resultData = {
        id: `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        outcome: winner ? `${winner} Wins` : 'Draw',
        totalMoves: moveHistory.length,
        finalBoardState: squares,
        moves: moveHistory,
        finishedAt: new Date().toISOString()
      };

      setGameResultsBatch(prevBatch => {
        const newBatch = [...prevBatch, resultData];
        if (newBatch.length >= 10) {
          saveThingsToDatabase('postTicTacToeGames', newBatch);
          return [];
        }
        return newBatch;
      });
    }
  }, [squares, moveHistory]);

  // The main game simulation loop.
  useEffect(() => {
    const gameResult = calculateWinner(squares);
    const winner = gameResult ? gameResult.winner : null;
    const isBoardFull = squares.every(square => square !== null);

    if (winner || isBoardFull) {
      if (gameResult) setWinningLine(gameResult.line);

      setTimeout(() => {
        setStats(prevStats => ({
          xWins: winner === 'X' ? prevStats.xWins + 1 : prevStats.xWins,
          oWins: winner === 'O' ? prevStats.oWins + 1 : prevStats.oWins,
          draws: !winner && isBoardFull ? prevStats.draws + 1 : prevStats.draws,
        }));
        setWinningLine(null);
        setSquares(Array(9).fill(null));
        setMoveHistory([]);
        setIsXNext(true);
      }, speed * 2);
      return;
    }

    if (!isPlaying) return;

    const timer = setTimeout(() => {
      const currentPlayer = isXNext ? 'X' : 'O';
      const move = findBestMove(squares, currentPlayer);

      if (move !== -1) {
        setMoveHistory(prev => [...prev, { player: currentPlayer, position: move }]);
        const newSquares = [...squares];
        newSquares[move] = currentPlayer;
        setSquares(newSquares);
        setIsXNext(!isXNext);
      }
    }, speed * .1);

    return () => clearTimeout(timer);
  }, [squares, isXNext, isPlaying, speed, findBestMove]);

  const totalGames = stats.xWins + stats.oWins + stats.draws;
  const xWinPercent = totalGames > 0 ? ((stats.xWins / totalGames) * 100).toFixed(0) : 0;
  const oWinPercent = totalGames > 0 ? ((stats.oWins / totalGames) * 100).toFixed(0) : 0;
  const drawPercent = totalGames > 0 ? ((stats.draws / totalGames) * 100).toFixed(0) : 0;

  const getLineCoordinates = (line) => {
    if (!line) return null;
    const getPercentCoords = (index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      return { x: col * 33.33 + 16.66, y: row * 33.33 + 16.66 };
    };
    const start = getPercentCoords(line[0]);
    const end = getPercentCoords(line[2]);
    return { x1: `${start.x}%`, y1: `${start.y}%`, x2: `${end.x}%`, y2: `${end.y}%` };
  };

  const lineCoords = winningLine ? getLineCoordinates(winningLine) : null;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-gray-800/50 p-6 md:p-8 rounded-2xl shadow-2xl backdrop-blur-sm border border-gray-700 w-full max-w-7xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-yellow-400">
          Tic Tac Toe AI Lab
        </h1>

        <div className="flex flex-col lg:flex-row gap-8 md:gap-12 justify-center items-start">

          <div className="relative flex-shrink-0 flex justify-center items-center">
            <div className="grid grid-cols-3 gap-3">
              {squares.map((value, i) => <Square key={i} value={value} />)}
            </div>
            {lineCoords && (
              <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <line
                  x1={lineCoords.x1} y1={lineCoords.y1} x2={lineCoords.x2} y2={lineCoords.y2}
                  className="stroke-red-500 animate-pulse" strokeWidth="10" strokeLinecap="round" />
              </svg>
            )}
          </div>

          <div className="flex flex-col justify-start gap-8 w-full lg:w-64 flex-shrink-0">
            <div className="w-full text-center bg-gray-900/50 p-4 rounded-lg border border-gray-700">
              <h2 className="text-2xl font-bold mb-4 text-gray-300">Live Stats</h2>
              <div className="space-y-2 text-lg">
                <div className="text-cyan-400">X Wins: <span className="font-bold">{stats.xWins}</span> ({xWinPercent}%)</div>
                <div className="text-yellow-400">O Wins: <span className="font-bold">{stats.oWins}</span> ({oWinPercent}%)</div>
                <div className="text-gray-400">Draws: <span className="font-bold">{stats.draws}</span> ({drawPercent}%)</div>
              </div>
              <div className="mt-3 text-gray-500 text-sm">Session Games: {totalGames}</div>
              <div className="mt-1 text-gray-500 text-sm">API Batch: {gameResultsBatch.length} / 10</div>
            </div>

            <div className="w-full">
              <div className="flex items-center justify-center gap-4 mb-4">
                <button onClick={() => setIsPlaying(!isPlaying)}
                  className="px-6 py-2 w-32 bg-gradient-to-r from-purple-600 to-indigo-600 font-semibold rounded-lg shadow-lg hover:from-purple-500 hover:to-indigo-500 transition-all duration-300 transform hover:scale-105">
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <span>Faster</span>
                <input type="range" min="50" max="1000" step="50" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                <span>Slower</span>
              </div>
            </div>
          </div>

          <div className="w-full lg:flex-1">
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
              <div className="flex items-center justify-center text-center gap-2 mb-4">
                <h2 className="text-2xl font-bold text-gray-300">Recent Game History</h2>
                <button
                  onClick={fetchHistory}
                  className="p-1.5 text-gray-400 bg-gray-700/50 rounded-full hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-colors"
                  aria-label="Refresh game history"
                >
                  <svg fill="#000000" width="18px" height="18px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.146 4.854l-1.489 1.489A8 8 0 1 0 12 20a8.094 8.094 0 0 0 7.371-4.886 1 1 0 1 0-1.842-.779A6.071 6.071 0 0 1 12 18a6 6 0 1 1 4.243-10.243l-1.39 1.39a.5.5 0 0 0 .354.854H19.5A.5.5 0 0 0 20 9.5V5.207a.5.5 0 0 0-.854-.353z" />
                  </svg>
                </button>
              </div>
              <div className="max-h-[24.5rem] overflow-y-auto pr-2 space-y-3">
                {gameHistory && gameHistory.length > 0 ? gameHistory.map(game => (
                  <div key={game.id} className="bg-gray-900/50 p-3 rounded-lg flex items-center justify-between border border-gray-700 gap-4">
                    <MiniBoard finalBoardState={game.final_board_state} />
                    <div className="flex-grow text-left">
                      <p className={`font-bold ${game.outcome.includes('X') ? 'text-cyan-400' : game.outcome.includes('O') ? 'text-yellow-400' : 'text-gray-400'}`}>
                        {game.outcome}
                      </p>
                      <p className="text-sm text-gray-500">{game.total_moves} moves</p>
                    </div>
                    <p className="text-xs text-gray-500">{new Date(game.finished_at).toLocaleString()}</p>
                  </div>
                )) : (
                  <p className="text-center text-gray-500">Loading game history...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

