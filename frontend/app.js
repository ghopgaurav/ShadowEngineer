// API Base URL
const API_BASE = 'http://localhost:3000/api';

// State
let selectedFile = null;
let currentSession = null;
let chatSessionId = null;

// DOM Elements
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const uploadBtn = document.getElementById('uploadBtn');
const userIdInput = document.getElementById('userId');
const progressSection = document.getElementById('progressSection');
const resultsSection = document.getElementById('resultsSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupChatListeners();
});

function setupEventListeners() {
    // File input
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Upload button
    uploadBtn.addEventListener('click', handleUpload);
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        selectFile(file);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file) {
        selectFile(file);
    }
}

function selectFile(file) {
    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'video/mp4', 'video/webm', 'audio/webm'];
    const validExtensions = ['.mp3', '.wav', '.mp4', '.webm', '.m4a'];
    
    const isValidType = validTypes.includes(file.type) || 
                       validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidType) {
        alert('Please select a valid audio or video file (MP3, WAV, MP4, WebM)');
        return;
    }
    
    selectedFile = file;
    uploadBtn.disabled = false;
    
    // Show file info
    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-selected';
    fileInfo.innerHTML = `
        <strong>Selected:</strong> ${file.name} (${formatFileSize(file.size)})
    `;
    
    const existing = uploadArea.parentElement.querySelector('.file-selected');
    if (existing) existing.remove();
    
    uploadArea.parentElement.appendChild(fileInfo);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function handleUpload() {
    if (!selectedFile) return;
    
    const userId = userIdInput.value.trim() || 'new_engineer';
    
    console.log('Starting upload...', {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        userId: userId,
        apiUrl: `${API_BASE}/upload-video`
    });
    
    // Hide upload section, show progress
    document.querySelector('.upload-section').style.display = 'none';
    progressSection.style.display = 'block';
    resultsSection.style.display = 'none';
    
    try {
        // Step 1: Upload file
        updateProgress(1, 20, 'Uploading file...');
        const formData = new FormData();
        formData.append('audio', selectedFile);
        formData.append('userId', userId);
        
        console.log('Sending request to:', `${API_BASE}/upload-video`);
        
        const uploadResponse = await fetch(`${API_BASE}/upload-video`, {
            method: 'POST',
            body: formData
        });
        
        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({}));
            throw new Error(errorData.error || `Upload failed with status ${uploadResponse.status}`);
        }
        
        const uploadData = await uploadResponse.json();
        
        // Step 2: Show transcription to user
        updateProgress(2, 40, 'Transcription complete! Review below...');
        const transcript = uploadData.transcript;
        
        // Display transcript immediately
        showTranscriptPreview(transcript);
        
        // Wait a moment for user to see transcript
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 3: AI Analysis with Bedrock Agent
        updateProgress(3, 70, 'AI analyzing transcript with Bedrock Agent...');
        
        const analysisResponse = await fetch(`${API_BASE}/process-standup-agent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                transcript: transcript,
                userId: userId
            })
        });
        
        if (!analysisResponse.ok) {
            throw new Error('Analysis failed');
        }
        
        const analysisData = await analysisResponse.json();
        
        // Step 4: Map with data
        updateProgress(4, 100, 'Mapping with Jira tickets and documentation...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Display full results
        displayResults(transcript, analysisData, uploadData);
        
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred: ' + error.message);
        resetForm();
    }
}

function showTranscriptPreview(transcript) {
    // Add transcript preview to progress section
    const progressCard = document.querySelector('.progress-card');
    
    // Remove existing preview if any
    const existingPreview = document.getElementById('transcriptPreview');
    if (existingPreview) {
        existingPreview.remove();
    }
    
    // Create transcript preview
    const preview = document.createElement('div');
    preview.id = 'transcriptPreview';
    preview.className = 'transcript-preview';
    preview.innerHTML = `
        <h4>📝 Transcription Complete</h4>
        <div class="transcript-preview-box">
            ${transcript}
        </div>
        <p class="preview-note">✨ Now analyzing with AI...</p>
    `;
    
    progressCard.appendChild(preview);
}

function updateProgress(step, percentage, text) {
    // Update progress bar
    progressFill.style.width = percentage + '%';
    progressText.textContent = text;
    
    // Update steps
    for (let i = 1; i <= 4; i++) {
        const stepEl = document.getElementById(`step${i}`);
        if (i < step) {
            stepEl.classList.add('completed');
            stepEl.classList.remove('active');
        } else if (i === step) {
            stepEl.classList.add('active');
            stepEl.classList.remove('completed');
        } else {
            stepEl.classList.remove('active', 'completed');
        }
    }
}

function displayResults(transcript, analysisData, uploadData) {
    // Hide progress, show results
    progressSection.style.display = 'none';
    resultsSection.style.display = 'block';
    
    // Display transcript
    document.getElementById('transcriptBox').textContent = transcript;
    
    // Display AI summary
    document.getElementById('summaryBox').textContent = analysisData.response || 'No summary available';
    
    // Store session ID for chat
    if (analysisData.sessionId) {
        chatSessionId = analysisData.sessionId;
    }
    
    // Display mapped tickets
    displayTickets(uploadData.mappedTickets || []);
    
    // Display documentation
    displayDocs(uploadData.mappedDocs || []);
    
    // Display tutorial videos
    displayTutorials(uploadData.mappedTutorials || []);
    
    // Display glossary terms
    displayGlossary(uploadData.technicalTerms || {});
    
    // Display action items
    displayActions(extractActionItems(analysisData.response));
    
    // Show chat section for follow-up questions
    showChatSection();
}

function displayTickets(tickets) {
    const grid = document.getElementById('ticketsGrid');
    grid.innerHTML = '';
    
    if (!tickets || tickets.length === 0) {
        grid.innerHTML = '<p style="color: #6c757d;">No tickets mapped from the transcript.</p>';
        return;
    }
    
    tickets.forEach(ticket => {
        const card = document.createElement('div');
        card.className = 'ticket-card';
        card.innerHTML = `
            <div class="ticket-id">${ticket.id}</div>
            <div class="ticket-title">${ticket.title}</div>
            <div class="ticket-desc">${ticket.description}</div>
            <div class="ticket-meta">
                <span class="priority-${ticket.priority.toLowerCase()}">${ticket.priority}</span>
                <span>${ticket.estimatedHours}h estimated</span>
            </div>
        `;
        grid.appendChild(card);
    });
}

function displayDocs(docs) {
    const list = document.getElementById('docsList');
    list.innerHTML = '';
    
    if (!docs || docs.length === 0) {
        list.innerHTML = '<p style="color: #6c757d;">No documentation mapped.</p>';
        return;
    }
    
    docs.forEach(doc => {
        const item = document.createElement('div');
        item.className = 'doc-item';
        item.innerHTML = `
            <div class="doc-name">📄 ${doc.name}</div>
            <div class="doc-source">${doc.source || 'S3 Documentation'}</div>
        `;
        list.appendChild(item);
    });
}

function displayTutorials(tutorials) {
    const grid = document.getElementById('tutorialsList');
    grid.innerHTML = '';
    
    if (!tutorials || tutorials.length === 0) {
        grid.innerHTML = '<p style="color: #6c757d;">No tutorial videos mapped from the transcript.</p>';
        return;
    }
    
    tutorials.forEach(tutorial => {
        const card = document.createElement('div');
        card.className = 'tutorial-card';
        card.innerHTML = `
            <div class="tutorial-header">
                <span class="tutorial-id">${tutorial.id}</span>
                <span class="tutorial-duration">⏱️ ${tutorial.duration}</span>
            </div>
            <div class="tutorial-title">${tutorial.title}</div>
            <div class="tutorial-desc">${tutorial.description}</div>
            <div class="tutorial-footer">
                <span class="tutorial-difficulty difficulty-${tutorial.difficulty}">${tutorial.difficulty}</span>
                ${tutorial.relatedTickets && tutorial.relatedTickets.length > 0 ? 
                    `<span class="tutorial-tickets">🎫 ${tutorial.relatedTickets.join(', ')}</span>` : ''}
            </div>
        `;
        grid.appendChild(card);
    });
}

function displayGlossary(terms) {
    const list = document.getElementById('glossaryList');
    list.innerHTML = '';
    
    if (!terms || Object.keys(terms).length === 0) {
        list.innerHTML = '<p style="color: #6c757d;">No technical terms identified.</p>';
        return;
    }
    
    Object.entries(terms).forEach(([term, definition]) => {
        const item = document.createElement('div');
        item.className = 'glossary-item';
        item.innerHTML = `
            <div class="glossary-term">${term}</div>
            <div class="glossary-def">${definition}</div>
        `;
        list.appendChild(item);
    });
}

function displayActions(actions) {
    const list = document.getElementById('actionsList');
    list.innerHTML = '';
    
    if (!actions || actions.length === 0) {
        list.innerHTML = '<p style="color: #6c757d;">No specific action items identified.</p>';
        return;
    }
    
    actions.forEach(action => {
        const item = document.createElement('div');
        item.className = 'action-item';
        item.textContent = action;
        list.appendChild(item);
    });
}

function extractActionItems(summary) {
    if (!summary) return [];
    
    const actions = [];
    const lines = summary.split('\n');
    
    lines.forEach(line => {
        // Look for action-oriented phrases
        if (line.match(/^[\d\-\*]\s*/) || 
            line.toLowerCase().includes('should') ||
            line.toLowerCase().includes('need to') ||
            line.toLowerCase().includes('start with') ||
            line.toLowerCase().includes('focus on')) {
            const cleaned = line.replace(/^[\d\-\*\.\s]+/, '').trim();
            if (cleaned.length > 10) {
                actions.push(cleaned);
            }
        }
    });
    
    return actions.slice(0, 10); // Limit to 10 actions
}

function resetForm() {
    selectedFile = null;
    fileInput.value = '';
    uploadBtn.disabled = true;
    
    const fileInfo = document.querySelector('.file-selected');
    if (fileInfo) fileInfo.remove();
    
    document.querySelector('.upload-section').style.display = 'block';
    progressSection.style.display = 'none';
    resultsSection.style.display = 'none';
    
    progressFill.style.width = '0%';
    progressText.textContent = 'Starting...';
    
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`step${i}`).classList.remove('active', 'completed');
    }
}

// ============ MODE SWITCHING ============

function switchMode(mode) {
    const uploadSection = document.querySelector('.upload-section');
    const chatSection = document.getElementById('chatSection');
    const uploadModeBtn = document.getElementById('uploadModeBtn');
    const chatModeBtn = document.getElementById('chatModeBtn');
    const resultsSection = document.getElementById('resultsSection');
    const progressSection = document.getElementById('progressSection');
    
    if (mode === 'upload') {
        uploadSection.style.display = 'block';
        chatSection.style.display = 'none';
        uploadModeBtn.classList.add('active');
        chatModeBtn.classList.remove('active');
        // Keep results visible if they exist
    } else if (mode === 'chat') {
        uploadSection.style.display = 'none';
        progressSection.style.display = 'none';
        resultsSection.style.display = 'none';
        chatSection.style.display = 'block';
        uploadModeBtn.classList.remove('active');
        chatModeBtn.classList.add('active');
        
        // Initialize chat if no session
        if (!chatSessionId) {
            chatSessionId = `session-${Date.now()}`;
        }
    }
}

// ============ CHAT FUNCTIONALITY ============

function setupChatListeners() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    
    if (!chatInput || !sendBtn) {
        console.log('Chat elements not found yet');
        return;
    }
    
    // Send on Enter key
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    // Clear input
    chatInput.value = '';
    
    // Add user message to chat
    addMessageToChat(message, 'user');
    
    // Show typing indicator
    const typingId = addTypingIndicator();
    
    try {
        // Send to Bedrock Agent
        const response = await fetch(`${API_BASE}/agent-chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                sessionId: chatSessionId
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to get response from agent');
        }
        
        const data = await response.json();
        
        // Update session ID if new
        if (data.sessionId) {
            chatSessionId = data.sessionId;
        }
        
        // Remove typing indicator
        removeTypingIndicator(typingId);
        
        // Add bot response
        addMessageToChat(data.response || 'I apologize, but I could not process that request.', 'bot');
        
    } catch (error) {
        console.error('Chat error:', error);
        removeTypingIndicator(typingId);
        addMessageToChat('Sorry, I encountered an error. Please try again.', 'bot');
    }
}

function sendSuggestion(suggestionText) {
    const chatInput = document.getElementById('chatInput');
    chatInput.value = suggestionText;
    sendMessage();
}

function addMessageToChat(text, sender) {
    const chatMessages = document.getElementById('chatMessages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? '👤' : '🤖';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    // Format message with line breaks and lists
    const formattedText = formatMessageText(text);
    content.innerHTML = formattedText;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatMessageText(text) {
    // Convert markdown-style formatting to HTML
    let formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\n\n/g, '</p><p>') // Paragraphs
        .replace(/\n- /g, '<br>• ') // Bullet points
        .replace(/\n\d+\. /g, '<br>• '); // Numbered lists
    
    return `<p>${formatted}</p>`;
}

function addTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message typing-indicator';
    typingDiv.id = 'typingIndicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '🤖';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(content);
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return 'typingIndicator';
}

function removeTypingIndicator(id) {
    const indicator = document.getElementById(id);
    if (indicator) {
        indicator.remove();
    }
}

function showChatSection() {
    const chatSection = document.getElementById('chatSection');
    if (chatSection) {
        chatSection.style.display = 'block';
        
        // Initialize session if not already set
        if (!chatSessionId) {
            chatSessionId = `session-${Date.now()}`;
        }
        
        // Scroll to chat section
        setTimeout(() => {
            chatSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

