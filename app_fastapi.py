#!/usr/bin/env python3
"""
app_fastapi.py

A clean, production-ready FastAPI application with Pydantic validation to handle
incoming SOS POST requests and dispatch WhatsApp messages using Twilio's Content API.

Template ID: HX19465ec99a0574262ea2a7e1f8c73eb1
"""

import os
import json
from datetime import datetime
from typing import Dict, Any

try:
    from fastapi import FastAPI, HTTPException, status
    from pydantic import BaseModel, Field
except ImportError:
    print("Warning: fastapi and pydantic are required to run this script as a web server.")
    print("You can install them via: pip install fastapi pydantic uvicorn")

try:
    from twilio.rest import Client
except ImportError:
    print("Warning: twilio SDK is required. Install via: pip install twilio")

# Initialize FastAPI app
app = FastAPI(
    title="SafeGuard SOS Dispatcher API",
    description="Automated emergency dispatch using Twilio WhatsApp Content templates",
    version="1.0.0"
)

# 1. Pydantic request body validation schema
class SOSTriggerRequest(BaseModel):
    to_number: str = Field(
        ..., 
        description="The recipient's phone number. Can be standard format or prefixed with 'whatsapp:'"
    )
    name: str = Field(
        ..., 
        description="Name of the person in distress. Mapped to template variable {{1}}"
    )
    location: str = Field(
        ..., 
        description="Name of the location or landmark. Mapped to template variable {{2}}"
    )
    map_link: str = Field(
        ..., 
        description="Live location URL or Google Maps link. Mapped to template variable {{3}}"
    )
    gps: str = Field(
        ..., 
        description="Precise latitude and longitude string. Mapped to template variable {{4}}"
    )
    incident_id: str = Field(
        ..., 
        description="Unique identifier for the ongoing incident. Mapped to template variable {{6}}"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "to_number": "+919876543210",
                "name": "Anshika Pathak",
                "location": "NavGurukul Campus",
                "map_link": "https://maps.google.com/?q=28.5355,77.3910",
                "gps": "28.5355, 77.3910",
                "incident_id": "INC-882736"
            }
        }

# Helpers to properly format numbers for Twilio WhatsApp
def format_whatsapp_number(num: str) -> str:
    cleaned = num.strip()
    if not cleaned.startswith('whatsapp:'):
        if not cleaned.startswith('+'):
            cleaned = '+' + cleaned
        return f"whatsapp:{cleaned}"
    return cleaned

@app.post(
    "/api/sos/trigger", 
    status_code=status.HTTP_200_OK,
    response_model=Dict[str, Any],
    summary="Trigger an Emergency SOS WhatsApp message using Twilio Content templates"
)
def trigger_sos(payload: SOSTriggerRequest):
    """
    POST route to trigger an SOS template-based WhatsApp broadcast via Twilio Content API.
    """
    # 2. Retrieve Twilio credentials using environment variables
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    from_whatsapp = os.getenv('TWILIO_WHATSAPP_NUMBER', '+14155238886')

    # Guard clause for credentials
    if not account_sid or account_sid.startswith('your_'):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="TWILIO_ACCOUNT_SID environment variable is not configured."
        )
    if not auth_token or auth_token.startswith('your_'):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="TWILIO_AUTH_TOKEN environment variable is not configured."
        )

    # 3. Format numbers appropriately
    sender = format_whatsapp_number(from_whatsapp)
    recipient = format_whatsapp_number(payload.to_number)

    # 4. Map the variables exactly as specified:
    # {{1}} = Name
    # {{2}} = Location
    # {{3}} = Live Map Link
    # {{4}} = GPS Coordinates
    # {{5}} = Time
    # {{6}} = Incident ID
    current_time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")

    content_variables = {
        "1": payload.name,
        "2": payload.location,
        "3": payload.map_link,
        "4": payload.gps,
        "5": current_time_str,
        "6": payload.incident_id
    }

    content_sid = "HX19465ec99a0574262ea2a7e1f8c73eb1"

    # 5. Dispatch the message
    try:
        client = Client(account_sid, auth_token)
        message = client.messages.create(
            from_=sender,
            to=recipient,
            content_sid=content_sid,
            content_variables=json.dumps(content_variables)
        )

        return {
            "success": True,
            "message_sid": message.sid,
            "status": message.status,
            "recipient": recipient,
            "timestamp": current_time_str
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Twilio API Dispatch Failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    # Listen on Port 8000 for standard local testing
    print("Starting FastAPI SOS dispatcher. Press Ctrl+C to terminate.")
    uvicorn.run("app_fastapi:app", host="0.0.0.0", port=8000, reload=True)
