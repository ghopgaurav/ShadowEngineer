# AI Onboarding Copilot - Frontend

## Features

### 🎥 Video/Audio Upload & Analysis
Upload Team meetings/Tutorials (audio or video) and get AI-powered insights:
Video Link - https://www.loom.com/share/ffc258798f7e44049ad216f72f8d3b85

1. **Upload** - Drag & drop or click to upload audio/video files
2. **Transcribe** - Automatic transcription using Deepgram
3. **AI Analysis** - Bedrock Agent analyzes with Claude AI
4. **Smart Mapping** - Automatically maps to:
   - Jira tickets mentioned in the recording
   - Relevant documentation from S3
   - Technical terms with explanations
   - Action items for new joiners

### 📊 What You Get

#### Transcript
Full text transcription of the standup recording

#### AI-Powered Summary
Beginner-friendly explanation of:
- What was discussed
- What it means for you as a new joiner
- Technical concepts explained simply

#### Mapped Jira Tickets
Automatically identifies and displays:
- Tickets mentioned in the standup
- Related tickets based on keywords
- Priority and time estimates
- Descriptions in plain English

#### Related Documentation
Links to relevant docs from S3:
- Architecture overview
- Onboarding guides
- Technical specifications

#### Technical Terms Explained
Glossary of terms mentioned:
- Simple definitions
- Context-specific explanations
- No jargon

#### Action Items
Clear next steps:
- What to focus on today
- Which tickets to start with
- Who to talk to
- What to read

## How It Works

### Architecture Flow
```
User uploads video/audio
    ↓
Frontend (index.html)
    ↓
Backend API (/api/upload-video)
    ↓
Deepgram (transcription)
    ↓
Bedrock Agent (AI analysis)
    ├── Calls getTickets() → Lambda → S3
    ├── Calls getDocs() → Lambda → S3
    └── Calls getGlossary() → Lambda → S3
    ↓
Smart Mapping Algorithm
    ├── Maps tickets from transcript
    ├── Extracts technical terms
    └── Links relevant docs
    ↓
Frontend displays results
```

### Smart Mapping

#### Ticket Mapping
- Detects ticket IDs (e.g., "BE-101")
- Matches keywords from ticket titles
- Falls back to high-priority tickets

#### Term Extraction
- Identifies technical terms in transcript
- Provides definitions from glossary
- Shows common terms if none found

#### Doc Mapping
- Always includes architecture overview
- Adds onboarding guide
- Can be extended for more docs

## Usage

### 1. Start the Server
```bash
cd backend
npm start
```

### 2. Open Frontend
Navigate to: `http://localhost:3000`

### 3. Upload Recording
- Click upload area or drag & drop
- Supported formats: MP3, WAV, MP4, WebM
- Enter your name (optional)

### 4. Wait for Processing
Progress shown for:
- File upload
- Transcription
- AI analysis
- Data mapping

### 5. View Results
Get comprehensive analysis with:
- Full transcript
- AI summary
- Mapped tickets
- Documentation links
- Technical terms
- Action items

## Supported File Formats

### Audio
- MP3 (.mp3)
- WAV (.wav)
- M4A (.m4a)
- WebM Audio (.webm)

### Video
- MP4 (.mp4)
- WebM Video (.webm)

## API Endpoints Used

### POST /api/upload-video
Handles video/audio upload and processing
- **Input**: FormData with audio file and userId
- **Output**: Transcript, mapped data, analysis

### POST /api/process-standup-agent
Processes transcript with Bedrock Agent
- **Input**: { transcript, userId, sessionId }
- **Output**: AI analysis with tool calls

## Customization

### Adding More Documents
Edit `mapDocsFromTranscript()` in `backend/server.js`:
```javascript
mapped.push({
  name: 'your_doc.md',
  source: 'S3 Documentation'
});
```

### Adjusting Ticket Mapping
Modify `mapTicketsFromTranscript()` logic:
- Change keyword matching threshold
- Add custom mapping rules
- Filter by priority/status

### Styling
Edit `frontend/styles.css`:
- Colors: Update gradient and accent colors
- Layout: Modify grid and spacing
- Responsive: Adjust breakpoints

## Environment Variables

Required in `.env`:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=onboarding-copilot-docs
DEEPGRAM_API_KEY=your_deepgram_key
BEDROCK_AGENT_ID=your_agent_id
BEDROCK_AGENT_ALIAS_ID=your_alias_id
PORT=3000
```

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile: ✅ Responsive design

## Performance

### File Size Limits
- Recommended: < 100MB
- Maximum: Depends on server config
- Larger files take longer to process

### Processing Time
- Upload: ~1-5 seconds
- Transcription: ~10-30 seconds
- AI Analysis: ~5-15 seconds
- Total: ~20-50 seconds

## Troubleshooting

### Upload fails
- Check file format is supported
- Verify file size is reasonable
- Check server is running

### Transcription fails
- Verify Deepgram API key is valid
- Check audio quality is good
- Ensure file is not corrupted

### No results shown
- Check browser console for errors
- Verify backend API is accessible
- Check S3 bucket has data files

### Slow processing
- Large files take longer
- Check network connection
- Verify AWS region is correct

## Future Enhancements

- [ ] Real-time transcription
- [ ] Multiple language support
- [ ] Video playback with transcript sync
- [ ] Export results as PDF
- [ ] Share results with team
- [ ] Historical analysis view
- [ ] Custom glossary terms
- [ ] Integration with Jira API
- [ ] Slack notifications
- [ ] Calendar integration

## Security

- Files are processed in memory
- No permanent storage of uploads
- Transcripts can be saved to S3
- Use HTTPS in production
- Validate file types server-side
- Sanitize user inputs

## License

MIT License - See LICENSE file for details
