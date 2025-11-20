"""
Test MCP Server
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from server import (
    get_tickets,
    get_docs,
    get_glossary,
    get_compliance_requirements,
    write_summary,
    process_standup_audio
)


def test_get_tickets():
    print("\n🧪 Testing get_tickets()...")
    result = get_tickets()
    assert result['success'], "get_tickets failed"
    assert 'tickets' in result, "No tickets returned"
    print(f"✅ Found {result['count']} tickets")
    return result


def test_get_docs():
    print("\n🧪 Testing get_docs()...")
    result = get_docs("architecture_overview.md")
    assert result['success'], "get_docs failed"
    assert 'content' in result, "No content returned"
    print(f"✅ Loaded doc: {result['doc_name']} from {result['source']}")
    return result


def test_get_glossary():
    print("\n🧪 Testing get_glossary()...")
    result = get_glossary()
    assert result['success'], "get_glossary failed"
    assert 'glossary' in result, "No glossary returned"
    print(f"✅ Loaded {result['term_count']} terms")
    return result


def test_get_compliance():
    print("\n🧪 Testing get_compliance_requirements()...")
    result = get_compliance_requirements()
    assert result['success'], "get_compliance_requirements failed"
    assert 'requirements' in result, "No requirements returned"
    print(f"✅ Loaded {result['count']} compliance items")
    return result


def test_write_summary():
    print("\n🧪 Testing write_summary()...")
    test_summary = {
        "standup_summary": "Test summary",
        "relevant_tickets": ["BE-101"],
        "focus_areas": ["Setup environment"]
    }
    result = write_summary(test_summary, "test_user")
    assert result['success'], "write_summary failed"
    print(f"✅ Saved summary: {result['summary_id']}")
    return result


def test_process_standup():
    print("\n🧪 Testing process_standup_audio() - FULL WORKFLOW...")
    
    sample_transcript = """
    Good morning team! Yesterday I worked on ticket BE-101, setting up my local 
    development environment. I got Docker and Node.js installed, but I'm having 
    some trouble with the AWS CLI configuration. 
    
    Today I plan to finish the environment setup and start looking at ticket BE-102 
    about the API Gateway. I might need some help understanding how our Lambda 
    functions connect to DynamoDB.
    
    No major blockers, just need to understand the architecture better.
    """
    
    result = process_standup_audio(sample_transcript, "test_engineer")
    
    if result['success']:
        print(f"✅ Workflow completed!")
        print(f"   Summary ID: {result.get('summary_id')}")
        print(f"   Tools used: {', '.join(result.get('tools_used', []))}")
        print(f"\n📝 Summary Preview:")
        summary = result.get('summary', {})
        print(f"   Focus areas: {summary.get('focus_areas', [])}")
        print(f"   Relevant tickets: {summary.get('relevant_tickets', [])}")
    else:
        print(f"❌ Workflow failed: {result.get('error')}")
    
    return result


def run_all_tests():
    print("=" * 60)
    print("🚀 MCP Server Test Suite")
    print("=" * 60)
    
    try:
        # Test individual tools
        test_get_tickets()
        test_get_docs()
        test_get_glossary()
        test_get_compliance()
        test_write_summary()
        
        # Test complete workflow
        test_process_standup()
        
        print("\n" + "=" * 60)
        print("✅ All tests passed!")
        print("=" * 60)
        
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    run_all_tests()
