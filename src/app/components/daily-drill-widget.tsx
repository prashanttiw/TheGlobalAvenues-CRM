import { useState, useEffect } from 'react';
import { Brain, Clock, Award, CheckCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const quizQuestions = [
  {
    question: 'What is the minimum IELTS score required for most UK universities?',
    options: ['5.5', '6.0', '6.5', '7.0'],
    correct: 2,
    category: 'IELTS',
  },
  {
    question: 'Which US visa type is required for international students?',
    options: ['B1/B2', 'F-1', 'H-1B', 'J-1'],
    correct: 1,
    category: 'Visa',
  },
  {
    question: 'How long is the Post-Study Work Visa in Canada?',
    options: ['1 year', '2 years', '3 years', '5 years'],
    correct: 2,
    category: 'Immigration',
  },
  {
    question: 'What is the GRE score out of?',
    options: ['800', '1600', '340', '170'],
    correct: 2,
    category: 'GRE',
  },
];

export function DailyDrillWidget() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [streak, setStreak] = useState(7);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isActive, setIsActive] = useState(false);

  const question = quizQuestions[currentQuestion];

  useEffect(() => {
    if (isActive && timeLeft > 0 && !showResult) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !showResult) {
      handleSubmit();
    }
  }, [timeLeft, isActive, showResult]);

  const handleAnswerSelect = (index: number) => {
    if (!showResult) {
      setSelectedAnswer(index);
    }
  };

  const handleSubmit = () => {
    setShowResult(true);
    setIsActive(false);
  };

  const handleNext = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setTimeLeft(60);
      setIsActive(true);
    }
  };

  const startQuiz = () => {
    setIsActive(true);
  };

  const isCorrect = selectedAnswer === question.correct;

  return (
    <section className="py-24 bg-gradient-to-br from-[#1A0A00] to-[#2D1200]">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md mb-4 border border-white/20">
            <Brain className="w-4 h-4 text-[#FD7E14]" />
            <span className="text-sm text-white font-semibold">The Daily Drill</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Your 1-Minute Daily Quiz
          </h2>
          <p className="text-lg text-white/80">
            Keep your study abroad knowledge sharp with a quick daily challenge
          </p>
        </div>

        <motion.div
          className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#FD7E14] to-[#1A0A00] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Question {currentQuestion + 1} of {quizQuestions.length}</h3>
                  <p className="text-sm text-white/80">{question.category}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                {/* Streak Counter */}
                <div className="text-center">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-5 h-5 text-yellow-300" />
                    <span className="text-2xl font-bold text-white">{streak}</span>
                  </div>
                  <p className="text-xs text-white/70">Day Streak</p>
                </div>

                {/* Timer */}
                <div className="text-center">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-5 h-5 text-white" />
                    <span className="text-2xl font-bold text-white">{timeLeft}s</span>
                  </div>
                  <p className="text-xs text-white/70">Time Left</p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Question Content */}
          <div className="p-8">
            {!isActive && currentQuestion === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FD7E14] to-[#1A0A00] flex items-center justify-center mx-auto mb-6">
                  <Brain className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-[#1A0A00] mb-4">
                  Ready for Today's Challenge?
                </h3>
                <p className="text-[#1A0A00]/70 mb-8">
                  Test your knowledge and maintain your streak!
                </p>
                <button
                  onClick={startQuiz}
                  className="bg-gradient-to-r from-[#FD7E14] to-[#1A0A00] text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Start Quiz
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-[#1A0A00] mb-8">
                  {question.question}
                </h3>

                <div className="space-y-4 mb-8">
                  {question.options.map((option, index) => (
                    <motion.button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={showResult}
                      className={`
                        w-full p-5 rounded-2xl border-2 transition-all text-left relative overflow-hidden
                        ${selectedAnswer === index
                          ? showResult
                            ? index === question.correct
                              ? 'border-green-500 bg-green-50'
                              : 'border-red-500 bg-red-50'
                            : 'border-[#FD7E14] bg-[#FD7E14]/5'
                          : 'border-gray-200 hover:border-[#FD7E14]/50 hover:bg-gray-50'
                        }
                        ${showResult && index === question.correct ? 'border-green-500 bg-green-50' : ''}
                      `}
                      whileHover={{ scale: showResult ? 1 : 1.02 }}
                      whileTap={{ scale: showResult ? 1 : 0.98 }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#1A0A00]">{option}</span>
                        
                        {showResult && (
                          <AnimatePresence>
                            {index === question.correct ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center"
                              >
                                <CheckCircle className="w-5 h-5 text-white" />
                              </motion.div>
                            ) : selectedAnswer === index ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center"
                              >
                                <X className="w-5 h-5 text-white" />
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Result Message */}
                <AnimatePresence>
                  {showResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`p-6 rounded-2xl mb-6 ${
                        isCorrect
                          ? 'bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200'
                          : 'bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200'
                      }`}
                    >
                      <h4 className={`text-xl font-bold mb-2 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                        {isCorrect ? '🎉 Correct!' : '❌ Incorrect'}
                      </h4>
                      <p className="text-[#1A0A00]/80">
                        {isCorrect
                          ? 'Great job! Your streak continues.'
                          : `The correct answer was: ${question.options[question.correct]}`}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  {!showResult ? (
                    <button
                      onClick={handleSubmit}
                      disabled={selectedAnswer === null}
                      className={`flex-1 py-4 rounded-xl font-semibold transition-all ${
                        selectedAnswer === null
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#FD7E14] to-[#1A0A00] text-white hover:shadow-lg'
                      }`}
                    >
                      Submit Answer
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className="flex-1 bg-gradient-to-r from-[#FD7E14] to-[#1A0A00] text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all"
                    >
                      {currentQuestion < quizQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-6 mt-8">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="text-3xl font-bold text-white mb-2">245</div>
            <div className="text-sm text-white/80">Questions Answered</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="text-3xl font-bold text-white mb-2">78%</div>
            <div className="text-sm text-white/80">Accuracy Rate</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="text-3xl font-bold text-white mb-2">🏆 12</div>
            <div className="text-sm text-white/80">Badges Earned</div>
          </div>
        </div>
      </div>
    </section>
  );
}
