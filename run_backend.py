#!/usr/bin/env python
"""
Backend launcher script
Runs: uvicorn backend.main:app --reload --port 8000
"""
import subprocess
import sys
import os

if __name__ == "__main__":
    os.chdir(os.path.dirname(__file__))
    
    print("🚀 Starting AutoTestGen+ Backend API...")
    print("📍 API will be available at http://localhost:8000")
    print("📚 Documentation at http://localhost:8000/docs")
    print("Press Ctrl+C to stop")
    print()
    
    try:
        subprocess.run(
            [sys.executable, "-m", "uvicorn", "backend.main:app", "--port", "8000"],
            check=True
        )
    except KeyboardInterrupt:
        print("\n\n✋ Backend stopped")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
