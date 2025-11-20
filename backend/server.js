require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const deepgramService = require('./services/deepgram');
const bedrockService = require('./services/bedrock');
const bedrockAgentClient = require('./services/bedrock-agent-client');
const mcpTools = require('../mcp-tools/tools');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const path = require('path');

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Voice transcription endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const audioBuffer = req.file.buffer;
    const transcript = await deepgramService.transcribe(audioBuffer);
    res.json({ success: true, transcript });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate onboarding plan
app.post('/api/generate-plan', async (req, res) => {
  try {
    const { role, background, voiceTranscript } = req.body;
    
    // Fetch required documents
    const [archDoc, jiraTickets, complianceReqs] = await Promise.all([
      mcpTools.get_docs_from_s3('architecture_overview.md'),
      mcpTools.get_jira_sample(),
      mcpTools.get_thoropass_requirements()
    ]);

    // Generate plan using Bedrock
    const plan = await bedrockService.generateOnboardingPlan({
      role,
      background: background || voiceTranscript,
      architecture: archDoc.content,
      tickets: jiraTickets.tickets,
      compliance: complianceReqs.requirements
    });
    
    // Save plan
    const result = await mcpTools.write_onboarding_plan(plan);
    res.json({ success: true, plan, planId: result.planId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Log daily progress
app.post('/api/log-progress', async (req, res) => {
  try {
    const { task, feeling, stuckArea, transcript } = req.body;
    const result = await mcpTools.log_progress({
      task,
      feeling,
      stuckArea,
      transcript
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get progress for manager dashboard
app.get('/api/progress', async (req, res) => {
  try {
    const result = await mcpTools.get_progress();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Log compliance completion
app.post('/api/log-compliance', async (req, res) => {
  try {
    const { itemId, itemName, userId } = req.body;
    const result = await mcpTools.log_compliance({ itemId, itemName, userId });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate compliance evidence
app.post('/api/generate-evidence', async (req, res) => {
  try {
    const { userId } = req.body;
    const result = await mcpTools.generate_compliance_evidence(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process standup with Bedrock Agent (TRUE AGENT)
app.post('/api/process-standup-agent', async (req, res) => {
  try {
    const { transcript, userId, sessionId } = req.body;
    
    console.log('📝 Processing standup with Bedrock Agent...');
    console.log(`   User: ${userId || 'new_joiner'}`);
    console.log(`   Transcript length: ${transcript?.length || 0} chars`);
    
    // Call Bedrock Agent - it will autonomously decide which tools to call!
    const result = await bedrockAgentClient.processStandupWithAgent(
      transcript,
      userId,
      sessionId
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error processing standup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Continue conversation with agent
app.post('/api/agent-chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'sessionId is required for continuing conversation' 
      });
    }
    
    const result = await bedrockAgentClient.continueConversation(message, sessionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload video/audio, transcribe, analyze with agent, and map with S3 data
app.post('/api/upload-video', upload.single('audio'), async (req, res) => {
  try {
    const audioBuffer = req.file.buffer;
    const userId = req.body.userId || 'new_engineer';
    
    console.log('📹 Processing video/audio upload...');
    console.log(`   File: ${req.file.originalname} (${req.file.size} bytes)`);
    console.log(`   User: ${userId}`);
    
    // Step 1: Transcribe with Deepgram
    console.log('🎙️ Transcribing audio...');
    const transcript = await deepgramService.transcribe(audioBuffer);
    console.log(`✅ Transcription complete: ${transcript.length} chars`);
    
    // Step 2: Fetch all S3 data for mapping
    console.log('📊 Fetching S3 data for mapping...');
    const [tickets, glossary, docs, tutorials] = await Promise.all([
      mcpTools.get_jira_sample(),
      mcpTools.get_glossary(),
      mcpTools.get_docs_from_s3('architecture_overview.md'),
      mcpTools.get_tutorial_videos()
    ]);
    
    // Step 3: Map transcript with tickets (find mentioned ticket IDs)
    const mappedTickets = mapTicketsFromTranscript(transcript, tickets.tickets);
    console.log(`🎫 Mapped ${mappedTickets.length} tickets from transcript`);
    
    // Step 4: Extract technical terms from transcript
    const technicalTerms = extractTechnicalTerms(transcript, glossary.glossary);
    console.log(`📖 Found ${Object.keys(technicalTerms).length} technical terms`);
    
    // Step 5: Map relevant documentation
    const mappedDocs = mapDocsFromTranscript(transcript, docs);
    console.log(`📚 Mapped ${mappedDocs.length} documentation files`);
    
    // Step 6: Map relevant tutorial videos (top 5)
    const mappedTutorials = mapTutorialsFromTranscript(transcript, mappedTickets, tutorials.videos);
    console.log(`🎬 Mapped ${mappedTutorials.length} tutorial videos`);
    
    res.json({
      success: true,
      transcript,
      mappedTickets,
      technicalTerms,
      mappedDocs,
      mappedTutorials,
      userId
    });
    
  } catch (error) {
    console.error('❌ Error processing video:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to map tickets from transcript
function mapTicketsFromTranscript(transcript, allTickets) {
  const mapped = [];
  const transcriptLower = transcript.toLowerCase();
  
  allTickets.forEach(ticket => {
    // Check if ticket ID is mentioned
    if (transcriptLower.includes(ticket.id.toLowerCase())) {
      mapped.push(ticket);
    }
    // Check if ticket title keywords are mentioned
    else {
      const titleWords = ticket.title.toLowerCase().split(' ');
      const matchCount = titleWords.filter(word => 
        word.length > 4 && transcriptLower.includes(word)
      ).length;
      
      if (matchCount >= 2) {
        mapped.push(ticket);
      }
    }
  });
  
  // If no tickets mapped, return high priority ones
  if (mapped.length === 0) {
    return allTickets.filter(t => t.priority === 'High').slice(0, 3);
  }
  
  return mapped;
}

// Helper function to extract technical terms
function extractTechnicalTerms(transcript, glossary) {
  const found = {};
  const transcriptLower = transcript.toLowerCase();
  
  Object.entries(glossary).forEach(([term, definition]) => {
    if (transcriptLower.includes(term.toLowerCase())) {
      found[term] = definition;
    }
  });
  
  // If no terms found, return common ones
  if (Object.keys(found).length === 0) {
    const commonTerms = ['API Gateway', 'Lambda', 'DynamoDB', 'S3', 'Node.js'];
    commonTerms.forEach(term => {
      if (glossary[term]) {
        found[term] = glossary[term];
      }
    });
  }
  
  return found;
}

// Helper function to map documentation
function mapDocsFromTranscript(transcript, docs) {
  const mapped = [];
  
  // Always include architecture overview
  if (docs.success) {
    mapped.push({
      name: docs.doc_name || 'architecture_overview.md',
      source: docs.source || 'S3 Documentation'
    });
  }
  
  // Add onboarding guide
  mapped.push({
    name: 'onboarding_guide.md',
    source: 'S3 Documentation'
  });
  
  return mapped;
}

// Helper function to map tutorial videos (top 5 most relevant)
function mapTutorialsFromTranscript(transcript, mappedTickets, allVideos) {
  const transcriptLower = transcript.toLowerCase();
  const ticketIds = mappedTickets.map(t => t.id);
  
  // Score each video based on relevance
  const scoredVideos = allVideos.map(video => {
    let score = 0;
    
    // Check if video is related to mapped tickets (high priority)
    const hasRelatedTicket = video.relatedTickets.some(tid => ticketIds.includes(tid));
    if (hasRelatedTicket) {
      score += 50;
    }
    
    // Check keyword matches in transcript
    const keywordMatches = video.keywords.filter(keyword => 
      transcriptLower.includes(keyword.toLowerCase())
    ).length;
    score += keywordMatches * 10;
    
    // Boost beginner-friendly videos
    if (video.difficulty === 'beginner') {
      score += 5;
    }
    
    return { ...video, relevanceScore: score };
  });
  
  // Sort by relevance and return top 5
  return scoredVideos
    .filter(v => v.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5)
    .map(({ relevanceScore, ...video }) => video); // Remove score from output
}
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 AI Onboarding Copilot running on port ${PORT}`);
});
