"""
Google Gemini API integration service
Handles all LLM interactions for quiz generation, feedback, and hints
"""
import google.generativeai as genai
from typing import Optional, List, Dict, Any
from app.core.config import settings


class GeminiService:
    """Service for interacting with Google Gemini API"""

    def __init__(self):
        """Initialize Gemini service with API key from settings"""
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
        else:
            self.model = None

    async def generate_quiz_questions(
        self,
        topic: str,
        difficulty: str,
        num_questions: int = 5,
        context: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Generate quiz questions using Gemini

        Args:
            topic: The topic for quiz questions
            difficulty: Difficulty level (easy, medium, hard)
            num_questions: Number of questions to generate
            context: Optional additional context or learning material

        Returns:
            List of quiz questions with distractors
        """
        if not self.model:
            raise ValueError("Gemini API key not configured")

        prompt = f"""Generate {num_questions} multiple-choice quiz questions about {topic} 
        at {difficulty} difficulty level.
        
        {f'Context: {context}' if context else ''}
        
        For each question, provide:
        1. Question text
        2. 4 answer options (1 correct, 3 plausible distractors)
        3. The correct answer
        4. Brief explanation
        
        Return as JSON array with format:
        [{{"question": "...", "options": ["A", "B", "C", "D"], "correct": "A", "explanation": "..."}}]
        """

        response = await self._generate_content(prompt)
        # TODO: Parse and validate response
        return response

    async def generate_hint(
        self,
        question: str,
        student_answer: Optional[str] = None,
        hint_level: int = 1,
    ) -> str:
        """
        Generate a hint for a quiz question

        Args:
            question: The quiz question
            student_answer: Student's current/previous answer
            hint_level: Level of hint (1=subtle, 2=moderate, 3=direct)

        Returns:
            Hint text
        """
        if not self.model:
            raise ValueError("Gemini API key not configured")

        hint_intensity = ["subtle", "moderate", "direct"][hint_level - 1]

        prompt = f"""Provide a {hint_intensity} hint for this question:
        
        Question: {question}
        {f'Student answered: {student_answer}' if student_answer else ''}
        
        Give a helpful hint without revealing the answer directly.
        """

        response = await self._generate_content(prompt)
        return response

    async def generate_feedback(
        self,
        question: str,
        correct_answer: str,
        student_answer: str,
        is_correct: bool,
    ) -> str:
        """
        Generate personalized feedback for a quiz answer

        Args:
            question: The quiz question
            correct_answer: The correct answer
            student_answer: Student's answer
            is_correct: Whether the answer was correct

        Returns:
            Feedback message
        """
        if not self.model:
            raise ValueError("Gemini API key not configured")

        prompt = f"""Generate encouraging, educational feedback for a student.
        
        Question: {question}
        Correct answer: {correct_answer}
        Student's answer: {student_answer}
        Result: {'Correct' if is_correct else 'Incorrect'}
        
        Provide brief, motivational feedback that:
        - Acknowledges their effort
        - Explains why the answer is correct/incorrect
        - Encourages continued learning
        
        Keep it concise (2-3 sentences).
        """

        response = await self._generate_content(prompt)
        return response

    async def _generate_content(
        self,
        prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """
        Internal method to generate content using Gemini

        Args:
            prompt: The prompt to send to Gemini
            temperature: Sampling temperature (default from settings)
            max_tokens: Maximum tokens to generate (default from settings)

        Returns:
            Generated text response
        """
        if not self.model:
            raise ValueError("Gemini API key not configured")

        generation_config = {
            "temperature": temperature or settings.GEMINI_TEMPERATURE,
            "max_output_tokens": max_tokens or settings.GEMINI_MAX_TOKENS,
        }

        # Note: For async, you might need to use asyncio.to_thread for sync API
        # This is a simplified version - adjust based on google-generativeai async support
        response = self.model.generate_content(
            prompt,
            generation_config=generation_config,
        )

        return response.text


# Global instance
gemini_service = GeminiService()

