"""
AI Client - Multi-Provider Support
Anthropic Claude (primary) + OpenAI (fallback)
"""

from anthropic import Anthropic
from openai import OpenAI
from typing import Optional, Dict, Any, List
import json
import logging
from datetime import datetime

from app.core.config import settings

logger = logging.getLogger(__name__)


class AIClient:
    """
    Multi-provider AI client with automatic fallback
    Supports Claude (Anthropic) and GPT-4 (OpenAI)
    """
    
    def __init__(self):
        """Initialize AI clients"""
        self.anthropic = None
        self.openai = None
        
        # Initialize Anthropic if key exists
        if settings.ANTHROPIC_API_KEY:
            self.anthropic = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            logger.info("Anthropic Claude initialized")
        
        # Initialize OpenAI if key exists
        if settings.OPENAI_API_KEY:
            self.openai = OpenAI(api_key=settings.OPENAI_API_KEY)
            logger.info("OpenAI GPT-4 initialized")
        
        # Determine primary provider
        self.primary_provider = settings.AI_PROVIDER
        
        if not self.anthropic and not self.openai:
            logger.warning("⚠️  No AI providers configured!")
    
    async def complete(
        self,
        prompt: str,
        system: str = "",
        max_tokens: int = 4096,
        temperature: float = 0.7,
        response_format: Optional[str] = None,  # "json" for structured output
        provider: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get completion from AI with automatic provider selection and fallback
        
        Args:
            prompt: User prompt
            system: System prompt (instructions)
            max_tokens: Maximum tokens to generate
            temperature: Randomness (0-1)
            response_format: "json" for JSON output, None for text
            provider: Force specific provider ("anthropic" or "openai")
        
        Returns:
            {
                "content": "AI response text",
                "provider": "anthropic",
                "model": "claude-3-5-sonnet-20241022",
                "tokens_used": 1234,
                "cost": 0.0037,
                "timestamp": "2025-01-01T12:00:00Z"
            }
        """
        # Determine which provider to use
        use_provider = provider or self.primary_provider
        
        try:
            # Try primary provider
            if use_provider == "anthropic" and self.anthropic:
                return await self._claude_complete(
                    prompt, system, max_tokens, temperature, response_format
                )
            elif use_provider == "openai" and self.openai:
                return await self._openai_complete(
                    prompt, system, max_tokens, temperature, response_format
                )
            else:
                raise ValueError(f"Provider '{use_provider}' not available")
        
        except Exception as e:
            logger.error(f"Primary provider '{use_provider}' failed: {e}")
            
            # Try fallback
            if use_provider == "anthropic" and self.openai:
                logger.info("Falling back to OpenAI...")
                return await self._openai_complete(
                    prompt, system, max_tokens, temperature, response_format
                )
            elif use_provider == "openai" and self.anthropic:
                logger.info("Falling back to Anthropic...")
                return await self._claude_complete(
                    prompt, system, max_tokens, temperature, response_format
                )
            else:
                raise Exception(f"All AI providers failed: {e}")
    
    async def _claude_complete(
        self,
        prompt: str,
        system: str,
        max_tokens: int,
        temperature: float,
        response_format: Optional[str],
    ) -> Dict[str, Any]:
        """Get completion from Claude"""
        
        # Prepare messages
        messages = [{"role": "user", "content": prompt}]
        
        # Add JSON instruction if needed
        if response_format == "json":
            system += "\n\nYou MUST respond with valid JSON only, no other text."
        
        # Make API call
        response = self.anthropic.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system,
            messages=messages,
        )
        
        # Extract content
        content = response.content[0].text
        
        # Parse JSON if requested
        if response_format == "json":
            try:
                # Try to extract JSON if wrapped in markdown
                if "```json" in content:
                    json_str = content.split("```json")[1].split("```")[0].strip()
                    content = json_str
                
                # Validate JSON
                json.loads(content)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON from Claude: {e}")
                logger.error(f"Content: {content}")
        
        # Calculate cost (Claude 3.5 Sonnet pricing)
        input_tokens = response.usage.input_tokens
        output_tokens = response.usage.output_tokens
        total_tokens = input_tokens + output_tokens
        
        # $3 per 1M input, $15 per 1M output
        cost = (input_tokens / 1_000_000 * 3) + (output_tokens / 1_000_000 * 15)
        
        return {
            "content": content,
            "provider": "anthropic",
            "model": settings.ANTHROPIC_MODEL,
            "tokens_used": total_tokens,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost": round(cost, 6),
            "timestamp": datetime.utcnow().isoformat(),
        }
    
    async def _openai_complete(
        self,
        prompt: str,
        system: str,
        max_tokens: int,
        temperature: float,
        response_format: Optional[str],
    ) -> Dict[str, Any]:
        """Get completion from OpenAI"""
        
        # Prepare messages
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ]
        
        # Prepare kwargs
        kwargs = {
            "model": settings.OPENAI_MODEL,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": messages,
        }
        
        # Add response format if JSON requested
        if response_format == "json":
            kwargs["response_format"] = {"type": "json_object"}
        
        # Make API call
        response = self.openai.chat.completions.create(**kwargs)
        
        # Extract content
        content = response.choices[0].message.content
        
        # Calculate cost (GPT-4 Turbo pricing)
        total_tokens = response.usage.total_tokens
        input_tokens = response.usage.prompt_tokens
        output_tokens = response.usage.completion_tokens
        
        # $10 per 1M input, $30 per 1M output
        cost = (input_tokens / 1_000_000 * 10) + (output_tokens / 1_000_000 * 30)
        
        return {
            "content": content,
            "provider": "openai",
            "model": settings.OPENAI_MODEL,
            "tokens_used": total_tokens,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost": round(cost, 6),
            "timestamp": datetime.utcnow().isoformat(),
        }
    
    async def generate_embeddings(
        self,
        texts: List[str],
        model: str = "text-embedding-3-small"
    ) -> List[List[float]]:
        """
        Generate embeddings for text (for vector search)
        Uses OpenAI embeddings API
        """
        if not self.openai:
            raise Exception("OpenAI not configured for embeddings")
        
        response = self.openai.embeddings.create(
            model=model,
            input=texts,
        )
        
        embeddings = [item.embedding for item in response.data]
        
        logger.info(f"Generated {len(embeddings)} embeddings")
        
        return embeddings
    
    async def stream_complete(
        self,
        prompt: str,
        system: str = "",
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ):
        """
        Stream completion from AI (for real-time responses)
        Yields chunks of text as they arrive
        """
        if self.primary_provider == "anthropic" and self.anthropic:
            async for chunk in self._claude_stream(prompt, system, max_tokens, temperature):
                yield chunk
        elif self.openai:
            async for chunk in self._openai_stream(prompt, system, max_tokens, temperature):
                yield chunk
        else:
            raise Exception("No AI provider available for streaming")
    
    async def _claude_stream(self, prompt, system, max_tokens, temperature):
        """Stream from Claude"""
        with self.anthropic.messages.stream(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            for text in stream.text_stream:
                yield text
    
    async def _openai_stream(self, prompt, system, max_tokens, temperature):
        """Stream from OpenAI"""
        stream = self.openai.chat.completions.create(
            model=settings.OPENAI_MODEL,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            stream=True,
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


# Global AI client instance
ai_client = AIClient()
