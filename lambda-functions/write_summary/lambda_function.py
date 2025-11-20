"""
Lambda Function: write_summary
Bedrock Agent Action - Save standup summary
"""

import json
import boto3
import os
from datetime import datetime

s3_client = boto3.client('s3')
BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'onboarding-copilot-docs')

def lambda_handler(event, context):
    """
    Save the generated standup summary.
    
    Parameters from Bedrock Agent:
    - summary: The complete summary object
    - user_id: User identifier
    """
    print(f"Event: {json.dumps(event)}")
    
    try:
        # Extract parameters
        parameters = event.get('parameters', [])
        summary = {}
        user_id = 'new_joiner'
        
        for param in parameters:
            if param.get('name') == 'summary':
                summary = json.loads(param.get('value', '{}'))
            elif param.get('name') == 'user_id':
                user_id = param.get('value', user_id)
        
        # Create summary with metadata
        timestamp = datetime.now().isoformat()
        summary_id = f"summary_{int(datetime.now().timestamp() * 1000)}"
        
        full_summary = {
            "id": summary_id,
            "user_id": user_id,
            "timestamp": timestamp,
            **summary
        }
        
        # Save to S3
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=f'summaries/{summary_id}.json',
            Body=json.dumps(full_summary, indent=2),
            ContentType='application/json'
        )
        
        response_body = {
            "application/json": {
                "body": json.dumps({
                    "success": True,
                    "summary_id": summary_id,
                    "saved_s3": True,
                    "location": f"s3://{BUCKET_NAME}/summaries/{summary_id}.json"
                })
            }
        }
        
        return {
            'statusCode': 200,
            'body': json.dumps(response_body)
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                "application/json": {
                    "body": json.dumps({
                        "success": False,
                        "error": str(e)
                    })
                }
            })
        }
