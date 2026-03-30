from typing import Dict, Any, Optional

class SocraticHintGenerator:
    """
    Generates Socratic, guiding hints rather than direct answers.
    Adapts the complexity of the hint based on the student's mastery score and requested hint level.
    """

    def generate_prompt_context(
        self, 
        question_text: str, 
        hint_level: int, 
        mastery_score: float = 0.5,
        misconception_type: Optional[str] = None
    ) -> str:
        """
        Constructs a prompt context to instruct the LLM on how to style the Socratic hint.
        
        Args:
            question_text: The original question text.
            hint_level: 1 (subtle), 2 (moderate), 3 (direct).
            mastery_score: Float between 0.0 and 1.0 indicating student proficiency.
            misconception_type: Optional categorization of the error.
        """
        # Tailor complexity based on mastery score
        if mastery_score < 0.3:
            complexity_guideline = "Use very simple language. Break concepts down into fundamental parts."
        elif mastery_score > 0.7:
            complexity_guideline = "Use advanced vocabulary. Challenge the student to synthesize information."
        else:
            complexity_guideline = "Use standard grade-level language."

        # Tailor Socratic guidance based on hint level
        if hint_level == 1:
            guidance = "Provide a very subtle, open-ended question that prompts the student to think broadly about the topic."
        elif hint_level == 2:
            guidance = "Provide a guiding question that points the student toward the specific concept or rule they need to apply."
        else:
            guidance = "Provide a highly focused question that almost reveals the answer, asking the student to make the final connection."

        # Add misconception context if available
        misconception_guideline = ""
        if misconception_type:
             misconception_guideline = f" Gently guide them away from the common misconception identified as '{misconception_type}'."

        prompt = (
            f"You are a Socratic tutor. Provide a hint for the following question: '{question_text}'.\n"
            f"Rules:\n"
            f"1. DO NOT give the direct answer.\n"
            f"2. {guidance}\n"
            f"3. {complexity_guideline}\n"
            f"{misconception_guideline}\n"
            f"Keep the hint concise, ideally 1-2 sentences."
        )

        return prompt

# Global instance
socratic_hint_generator = SocraticHintGenerator()
