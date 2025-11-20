// Basic setup tests
const fs = require('fs');
const path = require('path');

describe('Project Setup', () => {
  test('Environment example file exists', () => {
    const envExample = fs.existsSync('.env.example');
    expect(envExample).toBe(true);
  });

  test('Required data files exist', () => {
    const files = [
      'data/sample_jira_tickets.json',
      'data/compliance_requirements.json',
      'data/architecture_overview.md'
    ];
    
    files.forEach(file => {
      expect(fs.existsSync(file)).toBe(true);
    });
  });

  test('MCP tools module exports all functions', () => {
    const tools = require('../mcp-tools/tools');
    
    expect(typeof tools.get_docs_from_s3).toBe('function');
    expect(typeof tools.get_jira_sample).toBe('function');
    expect(typeof tools.write_onboarding_plan).toBe('function');
    expect(typeof tools.log_progress).toBe('function');
    expect(typeof tools.get_progress).toBe('function');
    expect(typeof tools.get_thoropass_requirements).toBe('function');
    expect(typeof tools.log_compliance).toBe('function');
    expect(typeof tools.generate_compliance_evidence).toBe('function');
  });

  test('Sample Jira tickets are valid JSON', () => {
    const data = fs.readFileSync('data/sample_jira_tickets.json', 'utf8');
    const tickets = JSON.parse(data);
    
    expect(Array.isArray(tickets)).toBe(true);
    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets[0]).toHaveProperty('id');
    expect(tickets[0]).toHaveProperty('title');
  });

  test('Compliance requirements are valid JSON', () => {
    const data = fs.readFileSync('data/compliance_requirements.json', 'utf8');
    const compliance = JSON.parse(data);
    
    expect(compliance).toHaveProperty('framework');
    expect(compliance).toHaveProperty('requirements');
    expect(Array.isArray(compliance.requirements)).toBe(true);
  });
});
