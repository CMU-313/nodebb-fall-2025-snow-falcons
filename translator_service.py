"""HTTP API wrapper for the translator service."""

import json
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

# Import the translator module
# Assuming the translator code is in a 'src' directory
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from src.translator import translate_content
except ImportError:
    # Fallback if src/translator.py doesn't exist yet
    print("Warning: src/translator.py not found. Using stub implementation.")
    def translate_content(content):
        return True, content

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from NodeBB

@app.route('/translate', methods=['POST'])
def translate():
    """Translate endpoint that matches NodeBB's expected format."""
    try:
        data = request.get_json()
        content = data.get('content', '')
        
        if not content:
            return jsonify({
                'isEnglish': True,
                'translatedContent': ''
            }), 200
        
        is_english, translated_content = translate_content(content)
        
        return jsonify({
            'isEnglish': is_english,
            'translatedContent': translated_content
        }), 200
    except Exception as e:
        print(f"Error in translate endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'isEnglish': True,
            'translatedContent': data.get('content', '')
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    port = int(os.getenv('TRANSLATOR_PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)


