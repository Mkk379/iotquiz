import React, { useState, useEffect, useRef } from 'react';
import { fetchScores, saveScore } from './scoresApi';

// --- SYLLABUS DATA ---
const UNITS = [
  { id: 1, title: "Introduction to IoT", keywords: ["SENSORS", "NETWORK", "EDGE", "RFID"] },
  { id: 2, title: "IoT Networking", keywords: ["BLUETOOTH", "ZIGBEE", "MQTT", "IPV6"] },
  { id: 3, title: "IoT Platforms", keywords: ["ARDUINO", "CLOUD", "ESP32", "DASHBOARD"] },
  { id: 4, title: "IoT Security", keywords: ["MALWARE", "SPOOFING", "ANALYTICS", "INTEGRITY"] },
  { id: 5, title: "IoT Applications", keywords: ["HEALTHCARE", "SMARTCITY", "GRID", "AUTOMATION"] }
];
const COLORS = ["#3B82F6", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B"];

// --- GRID GENERATOR (ZIG-ZAG, DIAGONAL & STRAIGHT) ---
const generateGrid = (unit) => {
  const size = 10;
  const grid = Array(size).fill(null).map(() => Array(size).fill(""));
  const placed = [];

  const ORTHO_DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]];

  unit.keywords.forEach((word, index) => {
    let path = null;
    let attempts = 0;

    while (!path && attempts < 150) {
      attempts++;
      let starts = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!grid[r][c] || grid[r][c] === word[0]) starts.push({ r, c });
        }
      }
      if (starts.length === 0) break;
      
      const start = starts[Math.floor(Math.random() * starts.length)];
      const isZigZag = Math.random() > 0.5;
      
      if (!isZigZag) {
        const d = DIRS[Math.floor(Math.random() * DIRS.length)];
        let currPath = [start];
        let ok = true;
        
        for (let i = 1; i < word.length; i++) {
          const nr = start.r + d[0] * i;
          const nc = start.c + d[1] * i;
          if (nr < 0 || nr >= size || nc < 0 || nc >= size) { ok = false; break; }
          if (grid[nr][nc] !== "" && grid[nr][nc] !== word[i]) { ok = false; break; }
          currPath.push({ r: nr, c: nc });
        }
        if (ok) path = currPath;
      } else {
        let foundPath = null;
        const dfs = (idx, currPath) => {
          if (foundPath) return;
          if (idx === word.length) { foundPath = currPath; return; }
          
          let last = currPath[currPath.length - 1];
          let shuffledDirs = [...ORTHO_DIRS].sort(() => Math.random() - 0.5);
          
          for (let d of shuffledDirs) {
            let nr = last.r + d[0];
            let nc = last.c + d[1];
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
              if ((grid[nr][nc] === "" || grid[nr][nc] === word[idx]) && !currPath.some(p => p.r === nr && p.c === nc)) {
                dfs(idx + 1, [...currPath, { r: nr, c: nc }]);
              }
            }
          }
        };
        dfs(1, [start]);
        if (foundPath) path = foundPath;
      }
    }

    if (path) {
      path.forEach((cell, i) => {
        grid[cell.r][cell.c] = word[i];
      });
      placed.push({ word, cells: path, color: COLORS[index % COLORS.length] });
    }
  });

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === "") grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
  }

  return { grid, size, placed };
};

const fmtTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

export default function App() {
  const [screen, setScreen] = useState('name');
  const [userName, setUserName] = useState('');
  const [currentUnit, setCurrentUnit] = useState(null);
  
  const [puzzle, setPuzzle] = useState(null);
  const [foundWords, setFoundWords] = useState([]);
  const [score, setScore] = useState(0);
  const [hints, setHints] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [puzzleKey, setPuzzleKey] = useState(0);
  
  // Global Leaderboard States (Google Sheets)
  const [globalScores, setGlobalScores] = useState([]);
  const [loadingLb, setLoadingLb] = useState(false);

  const [selectedCells, setSelectedCells] = useState([]);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    if (screen === 'puzzle' && currentUnit) {
      setPuzzle(generateGrid(currentUnit));
      setFoundWords([]);
      setSelectedCells([]);
      setScore(0);
      setHints(0);
      setElapsed(0);
      
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [screen, currentUnit, puzzleKey]);

  // Fetch Global Scores from Google Sheets
  const fetchGlobalLeaderboard = async (unitId) => {
    setLoadingLb(true);
    try {
      setGlobalScores(await fetchScores(unitId));
    } catch (e) {
      console.error("Error fetching leaderboard:", e);
    }
    setLoadingLb(false);
  };

  useEffect(() => {
    if (screen === 'leaderboard' && currentUnit) {
      fetchGlobalLeaderboard(currentUnit.id);
    }
  }, [screen, currentUnit]);

  // Check if puzzle is complete and save score to Google Sheets
  useEffect(() => {
    if (puzzle && foundWords.length > 0 && foundWords.length === puzzle.placed.length) {
      if (timerRef.current) clearInterval(timerRef.current);
      
      const finalScore = score + 500 - (hints * 20);
      const entry = { name: userName || 'Anonymous', score: finalScore, time: elapsed, date: new Date().toLocaleDateString() };
      
      saveScore(currentUnit.id, entry)
        .then(() => {
          setTimeout(() => setScreen('leaderboard'), 500);
        })
        .catch((err) => {
          console.error("Error saving score: ", err);
          setScreen('leaderboard');
        });
    }
  }, [foundWords, puzzle]);

  const handleStartPuzzle = (unit) => {
    setCurrentUnit(unit);
    setScreen('puzzle');
  };

  const handleNewPuzzle = () => {
    setPuzzleKey(prev => prev + 1);
  };

  const handleHint = () => {
    if (!puzzle) return;
    const remaining = puzzle.placed.filter(pw => !foundWords.includes(pw.word));
    if (remaining.length > 0) {
      setHints(h => h + 1);
      setScore(s => Math.max(0, s - 20));
      const wordToFind = remaining[Math.floor(Math.random() * remaining.length)];
      setFoundWords([...foundWords, wordToFind.word]);
    }
  };

  const handleMouseDown = (r, c) => {
    setIsMouseDown(true);
    setSelectedCells([{ r, c }]);
  };

  const handleMouseEnter = (r, c) => {
    if (!isMouseDown) return;
    if (selectedCells.some(cell => cell.r === r && cell.c === c)) return;
    
    const last = selectedCells[selectedCells.length - 1];
    const dr = Math.abs(r - last.r);
    const dc = Math.abs(c - last.c);
    if (dr <= 1 && dc <= 1) {
      setSelectedCells(prev => [...prev, { r, c }]);
    }
  };

  const handleMouseUp = () => {
    if (!isMouseDown) return;
    setIsMouseDown(false);

    if (selectedCells.length > 1) {
      const formedWord = selectedCells.map(cell => puzzle.grid[cell.r][cell.c]).join('');
      const revWord = formedWord.split('').reverse().join('');

      const match = puzzle.placed.find(pw => (pw.word === formedWord || pw.word === revWord) && !foundWords.includes(pw.word));

      if (match) {
        setFoundWords(prev => [...prev, match.word]);
        setScore(s => s + 100);
      }
    }
    setSelectedCells([]);
  };

  const styles = `
    body { background: #F8FAFC; color: #1E293B; font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; user-select: none; }
    .container { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    
    .card { background: #FFFFFF; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); width: 100%; max-width: 480px; text-align: center; }
    .input-field { background-color: #FFFFFF; color: #1E293B; width: 100%; padding: 16px; border-radius: 12px; border: 2px solid #E2E8F0; font-size: 16px; margin-bottom: 20px; box-sizing: border-box; outline: none; transition: 0.2s; }
    .input-field:focus { border-color: #8B5CF6; }
    .btn { background: #8B5CF6; color: white; border: none; padding: 16px; width: 100%; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; transition: 0.2s; }
    .btn:hover { background: #7C3AED; }
    
    .app-layout { display: flex; height: 100vh; width: 100vw; background: #FFFFFF; }
    .sidebar { width: 260px; background: #F8FAFC; border-right: 1px solid #E2E8F0; padding: 24px; overflow-y: auto; }
    .unit-btn { width: 100%; text-align: left; padding: 16px; margin-bottom: 12px; border-radius: 12px; border: 2px solid #E2E8F0; background: white; color: #1E293B; cursor: pointer; font-weight: 600; font-size: 14px; transition: 0.2s; display: flex; flex-direction: column; gap: 4px; }
    .unit-btn.active { border-color: #8B5CF6; background: #F5F3FF; }
    
    .main-area { flex: 1; padding: 40px; display: flex; flex-direction: column; align-items: center; overflow-y: auto; }
    .header { width: 100%; max-width: 900px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
    .stats { display: flex; gap: 20px; font-weight: 600; font-size: 14px; color: #64748B; }
    
    .game-section { display: flex; gap: 60px; max-width: 900px; width: 100%; justify-content: center; }
    
    .grid-wrapper { position: relative; display: inline-block; }
    .grid-container { display: grid; gap: 8px; position: relative; z-index: 2; grid-template-columns: repeat(10, 40px); background: #F8FAFC; padding: 16px; border-radius: 20px; border: 1px solid #E2E8F0; }
    .cell { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; cursor: pointer; border-radius: 50%; transition: background 0.1s; background: white; }
    .cell.selected { background: #FDE68A !important; color: #B45309 !important; }
    .cell:hover { background: #E2E8F0; }
    
    .svg-layer { position: absolute; top: 0; left: 0; z-index: 1; pointer-events: none; }
    
    .controls { display: flex; gap: 12px; margin-top: 40px; justify-content: center; }
    .btn-hint { background: #F59E0B; color: white; padding: 12px 24px; border-radius: 12px; border: none; font-weight: bold; cursor: pointer; }
    .btn-new { background: transparent; color: #3B82F6; border: 2px solid #3B82F6; padding: 12px 24px; border-radius: 12px; font-weight: bold; cursor: pointer; }
    .btn-leader { background: #8B5CF6; color: white; padding: 12px 24px; border-radius: 12px; border: none; font-weight: bold; cursor: pointer; }

    .keywords-panel { width: 280px; background: #F8FAFC; padding: 24px; border-radius: 20px; border: 1px solid #E2E8F0; }
    .kw-unfound { display: flex; align-items: center; gap: 12px; padding: 12px; font-weight: bold; color: #94A3B8; letter-spacing: 2px; }
    .kw-found { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; font-weight: bold; color: white; margin-bottom: 8px; }

    .lb-table { width: 100%; border-collapse: collapse; margin-top: 20px; text-align: left; }
    .lb-table th, .lb-table td { padding: 12px; border-bottom: 1px solid #E2E8F0; }
  `;

  if (screen === 'name') {
    return (
      <div className="container">
        <style>{styles}</style>
        <div className="card">
          <h2 style={{ marginTop: 0, color: '#1E293B' }}>IoT Global Arena</h2>
          <p style={{ color: '#64748B', marginBottom: '32px' }}>Enter your name to compete worldwide.</p>
          <input type="text" className="input-field" placeholder="Your Name or Nickname" value={userName} onChange={(e) => setUserName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && userName && setScreen('units')} />
          <button className="btn" onClick={() => userName && setScreen('units')} disabled={!userName}>Start Competing</button>
        </div>
      </div>
    );
  }

  if (screen === 'units') {
    return (
      <div className="container">
        <style>{styles}</style>
        <div className="card" style={{ maxWidth: '500px' }}>
          <h2 style={{ marginTop: 0, color: '#1E293B' }}>Welcome, {userName}!</h2>
          <p style={{ color: '#64748B', marginBottom: '32px' }}>Select an IoT Unit to enter the global leaderboard:</p>
          {UNITS.map(u => (
            <button key={u.id} className="unit-btn" onClick={() => handleStartPuzzle(u)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[u.id % COLORS.length] }}></div>
                <strong>Unit {u.id}</strong>
              </div>
              <div style={{ color: '#64748B', marginLeft: '18px' }}>{u.title}</div>
            </button>
          ))}
          <button style={{ marginTop: '20px', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setScreen('name')}>← Change Name</button>
        </div>
      </div>
    );
  }

  if (screen === 'leaderboard') {
    return (
      <div className="container">
        <style>{styles}</style>
        <div className="card" style={{ maxWidth: '650px', textAlign: 'left' }}>
          <h2 style={{ marginTop: 0, color: '#1E293B', textAlign: 'center' }}>🌍 Unit {currentUnit?.id} Global Leaderboard</h2>
          {loadingLb ? (
            <p style={{ textAlign: 'center', color: '#94A3B8' }}>Fetching global ranks...</p>
          ) : (
            <table className="lb-table">
              <thead>
                <tr style={{ color: '#64748B', fontWeight: 'bold' }}>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Score</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {globalScores.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94A3B8' }}>No scores yet. Be the first worldwide!</td></tr>
                ) : (
                  globalScores.map((row, idx) => (
                    <tr key={idx} style={{ background: row.name === userName ? '#F5F3FF' : 'transparent', fontWeight: row.name === userName ? 'bold' : 'normal' }}>
                      <td>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</td>
                      <td>{row.name} {row.name === userName && '(You)'}</td>
                      <td style={{ color: '#10B981' }}>{row.score}</td>
                      <td>{fmtTime(row.time)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
          <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
            <button className="btn" style={{ background: '#3B82F6' }} onClick={() => setScreen('units')}>Choose Unit</button>
            <button className="btn" style={{ background: '#10B981' }} onClick={() => handleStartPuzzle(currentUnit)}>Play Again</button>
          </div>
        </div>
      </div>
    );
  }

  if (!puzzle) return null;

  const cellCenter = (r, c) => ({ x: c * 48 + 32, y: r * 48 + 32 });
  const getPoints = (cells) => cells.map(c => {
    const p = cellCenter(c.r, c.c);
    return `${p.x},${p.y}`;
  }).join(' ');

  return (
    <div className="app-layout" onMouseUp={handleMouseUp}>
      <style>{styles}</style>
      
      <div className="sidebar">
        <h2 style={{ color: '#1E293B', marginTop: 0, marginBottom: '24px' }}>Units</h2>
        {UNITS.map(u => (
          <button key={u.id} className={`unit-btn ${currentUnit?.id === u.id ? 'active' : ''}`} onClick={() => handleStartPuzzle(u)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[u.id % COLORS.length] }}></div>
              <strong>Unit {u.id}</strong>
            </div>
            <div style={{ color: '#64748B', marginLeft: '18px' }}>{u.title}</div>
          </button>
        ))}
      </div>

      <div className="main-area">
        <div className="header">
          <h2 style={{ margin: 0, color: '#1E293B' }}>Unit {currentUnit?.id} — {currentUnit?.title}</h2>
          <div className="stats">
            <span>⏱ {fmtTime(elapsed)}</span>
            <span>SCORE: {score}</span>
            <span>WORDS: {foundWords.length}/{puzzle.placed.length}</span>
            <span>HINTS: {hints}</span>
          </div>
        </div>

        <div className="game-section">
          <div>
            <div className="grid-wrapper">
              <svg className="svg-layer" width={puzzle.size * 48 + 32} height={puzzle.size * 48 + 32}>
                {puzzle.placed.map((pw) => (
                  foundWords.includes(pw.word) && (
                    <polyline 
                      key={pw.word} 
                      points={getPoints(pw.cells)} 
                      fill="none" 
                      stroke={pw.color} 
                      strokeWidth="28" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      opacity="0.8" 
                    />
                  )
                ))}
              </svg>

              <div className="grid-container">
                {puzzle.grid.map((row, r) => row.map((letter, c) => {
                  const foundWord = puzzle.placed.find(pw => foundWords.includes(pw.word) && pw.cells.some(cell => cell.r === r && cell.c === c));
                  const startOfWord = puzzle.placed.find(pw => pw.cells[0].r === r && pw.cells[0].c === c);
                  const isSelected = selectedCells.some(cell => cell.r === r && cell.c === c);
                  
                  let fontColor = '#334155';
                  let fontWeight = '700';
                  let bg = 'white';
                  
                  if (foundWord) {
                    fontColor = 'white';
                    bg = foundWord.color;
                  } else if (startOfWord) {
                    fontColor = startOfWord.color; 
                    fontWeight = '900';
                  }

                  return (
                    <div 
                      key={`${r}-${c}`} 
                      className={`cell ${isSelected ? 'selected' : ''}`}
                      style={{ background: isSelected ? '#FDE68A' : bg, color: isSelected ? '#B45309' : fontColor, fontWeight: fontWeight }}
                      onMouseDown={() => handleMouseDown(r, c)}
                      onMouseEnter={() => handleMouseEnter(r, c)}
                    >
                      {letter}
                    </div>
                  );
                }))}
              </div>
            </div>

            <div className="controls">
              <button className="btn-hint" onClick={handleHint}>💡 HINT</button>
              <button className="btn-new" onClick={handleNewPuzzle}>🔄 New Puzzle</button>
              <button className="btn-leader" onClick={() => setScreen('leaderboard')}>🏆 Leaderboard</button>
            </div>
          </div>

          <div className="keywords-panel">
            <h3 style={{ margin: '0 0 20px 0', color: '#1E293B', textAlign: 'center' }}>Keywords</h3>
            {puzzle.placed.map(pw => {
              const isFound = foundWords.includes(pw.word);
              if (isFound) {
                return (
                  <div key={pw.word} className="kw-found" style={{ background: pw.color }}>
                    ✓ {pw.word}
                  </div>
                );
              }
              return (
                <div key={pw.word} className="kw-unfound">
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: pw.color }}></div>
                  {pw.word.split('').map(() => '_').join(' ')}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}