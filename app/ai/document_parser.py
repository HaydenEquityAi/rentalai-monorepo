"""
AI Document Parser - Intelligent Document Analysis
Parse leases, contracts, and other property documents with AI
"""

from typing import Dict, Any, List, Optional
import json
import logging
from datetime import datetime
from decimal import Decimal
from PyPDF2 import PdfReader
import docx
import re

from app.ai.client import ai_client

logger = logging.getLogger(__name__)


class DocumentParser:
    """Parse and extract structured data from documents using AI"""
    
    async def parse_lease(self, file_path: str) -> Dict[str, Any]:
        """
        Parse a lease document and extract key terms
        
        Args:
            file_path: Path to PDF or DOCX file
        
        Returns:
            {
                "monthly_rent": 1500.00,
                "security_deposit": 1500.00,
                "lease_start_date": "2025-02-01",
                "lease_end_date": "2026-01-31",
                "lease_term_months": 12,
                "tenant_names": ["John Doe", "Jane Doe"],
                "landlord_name": "ABC Properties LLC",
                "property_address": "123 Main St, Apt 4B, New York, NY 10001",
                "pet_policy": "No pets allowed",
                "parking_spaces": 1,
                "utilities_included": ["water", "trash"],
                "late_fee_amount": 50.00,
                "late_fee_grace_days": 5,
                "special_terms": [...],
                "renewal_terms": "...",
                "termination_clause": "...",
                "confidence_score": 0.92,
                "extracted_at": "2025-01-01T12:00:00Z",
                "warnings": []
            }
        """
        logger.info(f"Parsing lease document: {file_path}")
        
        # Extract text from document
        text = self._extract_text(file_path)
        
        if not text or len(text) < 100:
            return {
                "error": "Could not extract text from document",
                "confidence_score": 0.0,
            }
        
        # Prepare AI prompt
        system_prompt = """You are an expert real estate attorney specializing in lease agreements. 
Your job is to extract key information from lease documents with high accuracy.

IMPORTANT: Return ONLY valid JSON with the specified fields. No explanations, no markdown, just JSON."""

        user_prompt = f"""Extract the following information from this lease document:

LEASE DOCUMENT:
{text[:8000]}  # Truncate to fit in context

Return a JSON object with these fields:
- monthly_rent (number, decimal)
- security_deposit (number, decimal)
- lease_start_date (string, YYYY-MM-DD format)
- lease_end_date (string, YYYY-MM-DD format)
- lease_term_months (number)
- tenant_names (array of strings)
- landlord_name (string)
- property_address (string)
- unit_number (string or null)
- pet_policy (string)
- parking_spaces (number)
- utilities_included (array of strings)
- late_fee_amount (number or null)
- late_fee_grace_days (number or null)
- special_terms (array of strings - any unusual clauses)
- renewal_terms (string)
- termination_clause (string - notice requirements)

If a field cannot be found, use null. Be precise with dates and numbers."""

        try:
            # Get AI response
            response = await ai_client.complete(
                prompt=user_prompt,
                system=system_prompt,
                max_tokens=2000,
                temperature=0.1,  # Low temperature for accuracy
                response_format="json",
            )
            
            # Parse JSON response
            lease_data = json.loads(response["content"])
            
            # Calculate confidence score
            confidence = self._calculate_confidence(lease_data, text)
            
            # Add metadata
            lease_data.update({
                "confidence_score": confidence,
                "extracted_at": datetime.utcnow().isoformat(),
                "ai_provider": response["provider"],
                "ai_model": response["model"],
                "tokens_used": response["tokens_used"],
                "cost": response["cost"],
                "warnings": self._validate_lease_data(lease_data),
            })
            
            logger.info(f"Lease parsed successfully (confidence: {confidence:.2%})")
            
            return lease_data
        
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            return {
                "error": "AI returned invalid JSON",
                "confidence_score": 0.0,
                "raw_response": response.get("content", ""),
            }
        
        except Exception as e:
            logger.error(f"Error parsing lease: {e}")
            return {
                "error": str(e),
                "confidence_score": 0.0,
            }
    
    async def parse_property_management_agreement(
        self, file_path: str
    ) -> Dict[str, Any]:
        """
        Parse Property Management Agreement (PMA)
        Extract management fees, terms, responsibilities
        """
        logger.info(f"Parsing PMA: {file_path}")
        
        text = self._extract_text(file_path)
        
        system_prompt = """You are an expert in property management agreements. 
Extract key business terms from this agreement with high accuracy. Return only valid JSON."""

        user_prompt = f"""Extract the following from this Property Management Agreement:

DOCUMENT:
{text[:8000]}

Return JSON with these fields:
- management_fee_percentage (number, e.g., 8.0 for 8%)
- management_fee_flat (number or null)
- leasing_fee_percentage (number or null)
- leasing_fee_flat (number or null)
- maintenance_markup (number or null, percentage)
- term_months (number)
- start_date (string, YYYY-MM-DD)
- end_date (string, YYYY-MM-DD)
- termination_notice_days (number)
- manager_responsibilities (array of strings)
- owner_responsibilities (array of strings)
- expense_pass_through (array of strings)
- insurance_requirements (string)
- indemnification_clause (string)
- dispute_resolution (string)
- governing_law_state (string)

If not found, use null."""

        try:
            response = await ai_client.complete(
                prompt=user_prompt,
                system=system_prompt,
                max_tokens=2000,
                temperature=0.1,
                response_format="json",
            )
            
            pma_data = json.loads(response["content"])
            
            # Add metadata
            pma_data.update({
                "confidence_score": self._calculate_confidence(pma_data, text),
                "extracted_at": datetime.utcnow().isoformat(),
                "ai_provider": response["provider"],
                "tokens_used": response["tokens_used"],
                "cost": response["cost"],
            })
            
            return pma_data
        
        except Exception as e:
            logger.error(f"Error parsing PMA: {e}")
            return {"error": str(e), "confidence_score": 0.0}
    
    async def analyze_document_risks(self, file_path: str) -> Dict[str, Any]:
        """
        Analyze document for potential risks or unusual clauses
        """
        logger.info(f"Analyzing document risks: {file_path}")
        
        text = self._extract_text(file_path)
        
        system_prompt = """You are a real estate attorney specializing in risk analysis.
Identify potential issues, unusual clauses, or risks in this document."""

        user_prompt = f"""Analyze this document for risks:

DOCUMENT:
{text[:6000]}

Return JSON with:
- risk_level (string: "low", "medium", "high")
- risk_factors (array of objects with "category", "severity", "description")
- unusual_clauses (array of strings)
- missing_standard_clauses (array of strings)
- recommendations (array of strings)
- red_flags (array of strings - immediate concerns)

Focus on:
- Unfair terms
- Missing protections
- Ambiguous language
- Liability issues
- Compliance concerns"""

        try:
            response = await ai_client.complete(
                prompt=user_prompt,
                system=system_prompt,
                max_tokens=1500,
                temperature=0.2,
                response_format="json",
            )
            
            risk_data = json.loads(response["content"])
            
            risk_data.update({
                "analyzed_at": datetime.utcnow().isoformat(),
                "ai_provider": response["provider"],
            })
            
            return risk_data
        
        except Exception as e:
            logger.error(f"Error analyzing risks: {e}")
            return {"error": str(e)}
    
    async def summarize_document(
        self, file_path: str, max_length: int = 500
    ) -> Dict[str, Any]:
        """
        Generate concise summary of any document
        """
        text = self._extract_text(file_path)
        
        system_prompt = """You are an expert at summarizing real estate documents concisely.
Create a clear, accurate summary that captures the key points."""

        user_prompt = f"""Summarize this document in {max_length} characters or less:

DOCUMENT:
{text[:6000]}

Focus on:
- Document type
- Key parties
- Main terms
- Important dates
- Notable conditions"""

        try:
            response = await ai_client.complete(
                prompt=user_prompt,
                system=system_prompt,
                max_tokens=500,
                temperature=0.3,
            )
            
            return {
                "summary": response["content"],
                "word_count": len(response["content"].split()),
                "generated_at": datetime.utcnow().isoformat(),
            }
        
        except Exception as e:
            logger.error(f"Error summarizing: {e}")
            return {"error": str(e)}
    
    async def compare_documents(
        self, file_path1: str, file_path2: str
    ) -> Dict[str, Any]:
        """
        Compare two documents and highlight differences
        Useful for comparing lease versions or contracts
        """
        text1 = self._extract_text(file_path1)
        text2 = self._extract_text(file_path2)
        
        system_prompt = """You are an expert at comparing legal documents.
Identify all significant differences between two document versions."""

        user_prompt = f"""Compare these two documents and identify differences:

DOCUMENT 1:
{text1[:4000]}

DOCUMENT 2:
{text2[:4000]}

Return JSON with:
- key_differences (array of objects with "field", "doc1_value", "doc2_value")
- added_clauses (array of strings)
- removed_clauses (array of strings)
- material_changes (array of strings - significant changes)
- formatting_changes_only (boolean)"""

        try:
            response = await ai_client.complete(
                prompt=user_prompt,
                system=system_prompt,
                max_tokens=2000,
                temperature=0.1,
                response_format="json",
            )
            
            comparison = json.loads(response["content"])
            
            return {
                **comparison,
                "compared_at": datetime.utcnow().isoformat(),
            }
        
        except Exception as e:
            logger.error(f"Error comparing documents: {e}")
            return {"error": str(e)}
    
    # ========================================================================
    # HELPER METHODS
    # ========================================================================
    
    def _extract_text(self, file_path: str) -> str:
        """Extract text from PDF or DOCX"""
        try:
            if file_path.lower().endswith('.pdf'):
                return self._extract_pdf_text(file_path)
            elif file_path.lower().endswith('.docx'):
                return self._extract_docx_text(file_path)
            elif file_path.lower().endswith('.txt'):
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            else:
                raise ValueError(f"Unsupported file type: {file_path}")
        except Exception as e:
            logger.error(f"Error extracting text: {e}")
            return ""
    
    def _extract_pdf_text(self, file_path: str) -> str:
        """Extract text from PDF"""
        try:
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text
        except Exception as e:
            logger.error(f"Error reading PDF: {e}")
            return ""
    
    def _extract_docx_text(self, file_path: str) -> str:
        """Extract text from DOCX"""
        try:
            doc = docx.Document(file_path)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text
        except Exception as e:
            logger.error(f"Error reading DOCX: {e}")
            return ""
    
    def _calculate_confidence(self, data: Dict[str, Any], source_text: str) -> float:
        """
        Calculate confidence score based on:
        - Number of fields extracted
        - Presence of key fields
        - Data validation
        """
        score = 0.0
        max_score = 100.0
        
        # Required fields for lease
        required_fields = [
            'monthly_rent', 'lease_start_date', 'lease_end_date',
            'tenant_names', 'property_address'
        ]
        
        # Check required fields (40 points)
        for field in required_fields:
            if data.get(field):
                score += 8.0
        
        # Check optional fields (30 points)
        optional_fields = [
            'security_deposit', 'landlord_name', 'pet_policy',
            'parking_spaces', 'late_fee_amount'
        ]
        for field in optional_fields:
            if data.get(field):
                score += 6.0
        
        # Validate data formats (30 points)
        if data.get('lease_start_date'):
            if self._is_valid_date(data['lease_start_date']):
                score += 10.0
        
        if data.get('monthly_rent'):
            if isinstance(data['monthly_rent'], (int, float)) and data['monthly_rent'] > 0:
                score += 10.0
        
        if data.get('tenant_names'):
            if isinstance(data['tenant_names'], list) and len(data['tenant_names']) > 0:
                score += 10.0
        
        return min(score / max_score, 1.0)
    
    def _is_valid_date(self, date_str: str) -> bool:
        """Validate date string in YYYY-MM-DD format"""
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
            return True
        except:
            return False
    
    def _validate_lease_data(self, data: Dict[str, Any]) -> List[str]:
        """Validate extracted lease data and return warnings"""
        warnings = []
        
        # Check for missing critical fields
        if not data.get('monthly_rent'):
            warnings.append("Monthly rent not found")
        
        if not data.get('lease_start_date'):
            warnings.append("Lease start date not found")
        
        if not data.get('tenant_names') or len(data.get('tenant_names', [])) == 0:
            warnings.append("No tenant names found")
        
        # Validate data ranges
        if data.get('monthly_rent') and data['monthly_rent'] > 50000:
            warnings.append("Monthly rent seems unusually high - please verify")
        
        if data.get('security_deposit') and data.get('monthly_rent'):
            if data['security_deposit'] > data['monthly_rent'] * 3:
                warnings.append("Security deposit exceeds 3x monthly rent")
        
        if data.get('late_fee_grace_days') and data['late_fee_grace_days'] < 0:
            warnings.append("Negative grace period doesn't make sense")
        
        return warnings


# Global document parser instance
document_parser = DocumentParser()
