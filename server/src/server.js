const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const redis = require('redis');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Create Redis client
const url = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = redis.createClient({url});
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

// Hanshake with websocket client
app.get('/', (req, res) => {
	res.send("WebSocket server is running.");
});

// Define quiz questions
const quizQuestions = [
	{
	  	question: "What is the capital of France?",
		options: {
			A: "Berlin",
			B: "Madrid",
			C: "Paris",
		},
		correctAnswer: "C",
		points: 5,
	},
	{
		question: "What is 2 + 2?",
		options: {
			A: "3",
			B: "4",
			C: "5",
		},
		correctAnswer: "B",
		points: 10,
	},
	{
		question: "Which planet is known as the Red Planet?",
		options: {
			A: "Earth",
			B: "Mars",
			C: "Venus",
		},
		correctAnswer: "B",
		points: 20,
	},
];

// Get leaderboard from Redis
async function getLeaderboard() {
	try {
	  const leaderboardData = await redisClient.get('leaderboard');
	  return leaderboardData ? JSON.parse(leaderboardData) : { leaderboard: [] };
	} catch (err) {
	  console.error('Error fetching leaderboard:', err);
	  return { leaderboard: [] };
	}
}

// WebSocket connections
io.on('connection', (socket) => {
  console.log('New client connected');

  // Send quiz questions to the client
  socket.on('join-quiz', async (quizId) => {
    socket.join(quizId);
    socket.emit('quiz-questions', quizQuestions);

    // Send initial leaderboard
    const leaderboard = await getLeaderboard();
    socket.emit('score-update', leaderboard);
  });

  // Handle answer submission
  socket.on('submit-answer', async (data) => {
    const { quizId, answers } = data;
    let totalScore = 0;

    // Calculate total score
    quizQuestions.forEach((question, index) => {
		console.log(answers[index], question.correctAnswer);
		if (answers[index].localeCompare(question.correctAnswer) === 0) {
			console.log("Correct Answer");
			totalScore += question.points;
		} else console.log("Incorrect Answer");
    });

    // Get current leaderboard, if any, and add the current user's score
    try {
      const leaderboard = await getLeaderboard();
      const updatedLeaderboard = leaderboard.leaderboard.filter(entry => entry.quizId !== quizId);
      updatedLeaderboard.push({ quizId, score: totalScore }); 

      // Sort leaderboard by score in descending order
      updatedLeaderboard.sort((a, b) => b.score - a.score);

      // Update the global leaderboard in Redis
      await redisClient.set('leaderboard', JSON.stringify({ leaderboard: updatedLeaderboard }));

      // Emit the updated leaderboard to all users
      io.emit('score-update', { leaderboard: updatedLeaderboard } );

      // Emit the user's score to them
      socket.emit('user-score', totalScore);
    } catch (err) {
      console.error('Error saving score to Redis:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
