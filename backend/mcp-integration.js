// MCP Server Integration for Node.js Backend
const { spawn } = require('child_process');
const path = require('path');

/**
 * Call MCP Server from Node.js backend
 * 
 * This integrates the Python MCP server with the Express backend
 */
class MCPClient {
  constructor() {
    this.serverPath = path.join(__dirname, '../mcp-server/server.py');
  }

  /**
   * Process standup audio transcript through MCP server
   */
  async processStandup(transcript, userId = 'new_joiner') {
    return new Promise((resolve, reject) => {
      const python = spawn('python', [
        this.serverPath,
        'process_standup_audio',
        transcript,
        userId
      ]);

      let output = '';
      let error = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        error += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`MCP Server error: ${error}`));
        } else {
          try {
            resolve(JSON.parse(output));
          } catch (e) {
            reject(new Error(`Failed to parse MCP response: ${e.message}`));
          }
        }
      });
    });
  }
}

module.exports = new MCPClient();
