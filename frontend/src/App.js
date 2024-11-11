import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import { v4 as uuidv4 } from 'uuid';

const socket = io('http://localhost:8080');

function App() {
  const [questions, setQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(true);
  const [quizId, setQuizId] = useState(uuidv4());

  useEffect(() => {
    socket.emit('join-quiz', quizId);

    socket.on('quiz-questions', (quizQuestions) => {
      setQuestions(quizQuestions);
    });

    socket.on('user-score', (userScore) => {
      setScore(userScore);
      setSubmitted(true);
    });

    socket.on('score-update', (updatedLeaderboard) => {
      setLeaderboard(updatedLeaderboard.leaderboard);
    });

    return () => {
      socket.off('quiz-questions');
      socket.off('score-update');
      socket.off('user-score');
    };
  }, []);

  useEffect(() => {
    const allAnswered = questions.length > 0 && questions.every((_, index) => selectedAnswers[index] !== undefined);
    setIsSubmitDisabled(!allAnswered);
  }, [selectedAnswers, questions]);

  const handleAnswerSelect = (questionIndex, answer) => {
    setSelectedAnswers((prevAnswers) => ({
      ...prevAnswers,
      [questionIndex]: answer,
    }));
  };

  const submitAllAnswers = () => {
    const data = {
      quizId,
      answers: selectedAnswers,
    };
    socket.emit('submit-answer', data);
  };

  const renderQuizQuestion = () => {
    return (
      <div className="quiz-container">
        <div className='d-flex justify-content-between title'>
          <h2>Quiz</h2>
          <p className='mt-2'>Your session: <span className='bold'>{quizId}</span></p>
        </div>

        {!submitted ? (
          <div>
            {questions.map((question, index) => (
              <div key={index} className="question-block">
                <span className='poin'>Point: {question.points}</span>
                <p className='bold'>{question.question} </p>
                <div>
                  {Object.entries(question.options).map(([key, option]) => (
                    <label key={key} className='ml-2'>
                      <input
                        type="radio"
                        name={`answer-${index}`}
                        value={key}
                        checked={selectedAnswers[index] === key}
                        onChange={() => handleAnswerSelect(index, key)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button className='button' onClick={submitAllAnswers} disabled={isSubmitDisabled}>
              Submit
            </button>
          </div>
        ) : (
          <div>
            <div>
              <h3>Your Result</h3>
              <p>Your total score: {score} points</p>
            </div>
          </div>
        )}
      </div>   
    )
  }

  const renderLeaderboard = () => {
    return (
      <div className="leaderboard-container">
        <h2>Leaderboard</h2>
        <table className='table-leaderboard'>
          <thead>
            <tr>
              <th>Quiz ID</th>
              <th>Point</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard && leaderboard.map((entry, idx) => (
              <tr key={idx} className={`${quizId === entry.quizId ? 'background-red' : ''}`}>
                <td>{entry.quizId}</td>
                <td>{entry.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="app">
      {renderQuizQuestion()}
      {renderLeaderboard()} 
    </div>
  );
}

export default App;
