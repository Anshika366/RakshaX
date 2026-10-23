#!/usr/bin/env python3
"""
send_sos.py

A production-ready Python script to send safe and automated WhatsApp SOS messages
using Twilio's Content API templates.

Template ID: HX19465ec99a0574262ea2a7e1f8c73eb1
Variables:
  {{1}} = Name
  {{2}} = Location
  {{3}} = Live Map Link
  {{4}} = GPS Coordinates
  {{5}} = Time
  {{6}} = Incident ID
"""

import os
import sys
import json
import argparse
from datetime import datetime

# Optional: Load local .env file if available
def load_env_file():
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    key, val = line.split('=', 1)
                    # Strip spaces and optional quotes
                    key = key.strip()
                    val = val.strip().strip("'").strip('"')
                    os.environ[key] = val

# Try to load credentials from .env
load_env_file()

def send_whatsapp_sos(to_number, name, location, map_link, gps, time_str, incident_id):
    # 1. Retrieve Twilio credentials from environment variables
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    from_whatsapp = os.getenv('TWILIO_WHATSAPP_NUMBER', '+14155238886')

    # Validate inputs
    if not account_sid or account_sid.startswith('your_'):
        print("Error: TWILIO_ACCOUNT_SID environment variable is not set correctly.", file=sys.stderr)
        print("Please configure it in your environment or in a .env file.", file=sys.stderr)
        sys.exit(1)

    if not auth_token or auth_token.startswith('your_'):
        print("Error: TWILIO_AUTH_TOKEN environment variable is not set correctly.", file=sys.stderr)
        print("Please configure it in your environment or in a .env file.", file=sys.stderr)
        sys.exit(1)

    # Clean up phone numbers to ensure they have the proper whatsapp prefix
    def format_whatsapp_number(num):
        num = num.strip()
        if not num.startswith('whatsapp:'):
            # Ensure it has a leading '+' sign
            if not num.startswith('+'):
                num = '+' + num
            return f"whatsapp:{num}"
        return num

    sender_whatsapp = format_whatsapp_number(from_whatsapp)
    recipient_whatsapp = format_whatsapp_number(to_number)

    # Import Twilio inside function to allow running help/arg parsing without twilio package installed
    try:
        from twilio.rest import Client
    except ImportError:
        print("Error: 'twilio' library is not installed. Please install it with:\n\n    pip install twilio\n", file=sys.stderr)
        sys.exit(1)

    client = Client(account_sid, auth_token)

    # 2. Map template variables as specified by user:
    # {{1}} = Name
    # {{2}} = Location
    # {{3}} = Live Map Link
    # {{4}} = GPS Coordinates
    # {{5}} = Time
    # {{6}} = Incident ID
    content_variables = {
        "1": name,
        "2": location,
        "3": map_link,
        "4": gps,
        "5": time_str,
        "6": incident_id
    }

    # Content SID requested by user
    content_sid = "HX19465ec99a0574262ea2a7e1f8c73eb1"

    print(f"Sending WhatsApp template {content_sid}...")
    print(f"To: {recipient_whatsapp}")
    print(f"From: {sender_whatsapp}")
    print(f"Mapped variables: {json.dumps(content_variables, indent=2)}")

    try:
        # Create and send the message
        message = client.messages.create(
            from_=sender_whatsapp,
            to=recipient_whatsapp,
            content_sid=content_sid,
            content_variables=json.dumps(content_variables)
        )
        print("\nSuccess! Message dispatched successfully.")
        print(f"Message SID: {message.sid}")
        print(f"Status: {message.status}")
        return message.sid
    except Exception as e:
        print(f"\nAn error occurred while dispatching the message:\n{e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description="Send an SOS WhatsApp Message using Twilio Content Templates.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )

    # CLI Arguments
    parser.add_argument('--to', required=True, help="Recipient phone number (e.g. +919876543210)")
    parser.add_argument('--name', default="Jane Doe", help="SOS sender name ({{1}})")
    parser.add_argument('--location', default="SafeGuard Base Camp", help="Location name ({{2}})")
    parser.add_argument('--map-link', default="https://maps.google.com/?q=28.5355,77.3910", help="Live tracking map link ({{3}})")
    parser.add_argument('--gps', default="28.5355, 77.3910", help="GPS coordinates string ({{4}})")
    parser.add_argument('--time', default=datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"), help="SOS trigger time ({{5}})")
    parser.add_argument('--incident-id', default=f"INC-{int(datetime.now().timestamp())}", help="Incident identifier ({{6}})")

    args = parser.parse_args()

    send_whatsapp_sos(
        to_number=args.to,
        name=args.name,
        location=args.location,
        map_link=args.map_link,
        gps=args.gps,
        time_str=args.time,
        incident_id=args.incident_id
    )
