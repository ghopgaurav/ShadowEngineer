// Lambda Function: get-docs-from-s3
// This is how MCP tools would be deployed for Bedrock Agent integration

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({ region: process.env.AWS_REGION });

/**
 * Lambda handler for get_docs_from_s3 MCP tool
 * 
 * This function is invoked by Bedrock Agent when it needs to fetch documents
 * 
 * Input (from Bedrock Agent):
 * {
 *   "filename": "architecture_overview.md"
 * }
 * 
 * Output (to Bedrock Agent):
 * {
 *   "success": true,
 *   "content": "# Architecture Overview..."
 * }
 */
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract parameters from Bedrock Agent event
    const { filename } = event.parameters || event;
    
    if (!filename) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'filename parameter is required'
        })
      };
    }

    // Fetch document from S3
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `docs/${filename}`
    });

    const response = await s3Client.send(command);
    const content = await streamToString(response.Body);

    // Return in format Bedrock Agent expects
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        content,
        filename
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

// Helper function to convert stream to string
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// OpenAPI Schema for Bedrock Agent
// This would be configured in AWS Console when setting up the agent
const OPENAPI_SCHEMA = {
  openapi: '3.0.0',
  info: {
    title: 'Get Docs from S3',
    version: '1.0.0',
    description: 'Fetch documentation files from S3 bucket'
  },
  paths: {
    '/get-docs': {
      post: {
        summary: 'Fetch a document from S3',
        description: 'Retrieves documentation files like architecture overviews, guides, etc.',
        operationId: 'getDocsFromS3',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  filename: {
                    type: 'string',
                    description: 'Name of the file to fetch (e.g., architecture_overview.md)'
                  }
                },
                required: ['filename']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Document content',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    content: { type: 'string' },
                    filename: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
