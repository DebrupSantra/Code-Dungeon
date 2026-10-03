# Code Dungeon
Retro terminal RPG where you solve C / C++ / Java / Python questions to escape.

## Run in VS Code
1. Install Node.js 18+ (https://nodejs.org)
2. File > Open Folder... > this folder
3. Terminal > New Terminal, then:
   npm install
   npm run dev
4. Open the URL shown (usually http://localhost:5173)

Add questions in src/questions.js: [lang, difficulty 1-3, text, options, correctIndex]
Leaderboard and achievements are saved in your browser's localStorage.
