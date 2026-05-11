#!/usr/bin/env python3
"""
Browser automation via Chrome DevTools Protocol (CDP)
Tests the Nyx Sanitizer web application
"""

import json
import time
import websocket
import base64

CDP_URL = "ws://localhost:9222/devtools/page/25BDA892C91DAB8865FA518D5424E3C0"

def main():
    print("Connecting to browser via CDP...")
    ws = websocket.create_connection(CDP_URL)
    req_id = 0

    def send_cmd(method, params=None):
        nonlocal req_id
        req_id += 1
        cmd = {"id": req_id, "method": method}
        if params:
            cmd["params"] = params
        ws.send(json.dumps(cmd))
        return json.loads(ws.recv())

    try:
        # Enable runtime
        print("Enabling runtime...")
        send_cmd("Runtime.enable")

        # Wait for page to load
        time.sleep(2)

        # Get page content using documentElement
        print("\n=== Getting page content ===")
        result = send_cmd("Runtime.evaluate", {
            "expression": "document.documentElement.outerHTML",
            "returnByValue": True
        })

        if 'result' in result and 'result' in result['result']:
            html = result['result']['result'].get('value', '')
            print(f"HTML length: {len(html)}")

            # Check for key elements
            if 'Nyx Sanitizer' in html:
                print("✓ Nyx Sanitizer title found")
            if 'Evaluation' in html:
                print("✓ Evaluation button found")
            if 'Sanitize' in html:
                print("✓ Sanitize button found")

        # Get all button texts
        print("\n=== Buttons on page ===")
        result = send_cmd("Runtime.evaluate", {
            "expression": "Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t)",
            "returnByValue": True
        })
        if 'result' in result and 'result' in result['result']:
            buttons = result['result']['result'].get('value', [])
            for i, btn in enumerate(buttons[:10]):
                print(f"  Button {i+1}: {btn}")

        # Click Evaluation Mode button
        print("\n=== Clicking Evaluation Mode button ===")
        result = send_cmd("Runtime.evaluate", {
            "expression": """
                (function() {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const evalBtn = btns.find(b => b.textContent.includes('Evaluation'));
                    if (evalBtn) {
                        evalBtn.click();
                        return 'Clicked Evaluation Mode button';
                    }
                    return 'Button not found';
                })()
            """,
            "returnByValue": True
        })
        if 'result' in result and 'result' in result['result']:
            print(f"Result: {result['result']['result'].get('value', 'N/A')}")

        # Wait for page transition
        time.sleep(2)

        # Check evaluation page
        print("\n=== Evaluation Page ===")
        result = send_cmd("Runtime.evaluate", {
            "expression": "document.querySelector('h1')?.textContent",
            "returnByValue": True
        })
        if 'result' in result and 'result' in result['result']:
            heading = result['result']['result'].get('value', 'N/A')
            print(f"Page heading: {heading}")

        # Get model options
        print("\n=== Available Models ===")
        result = send_cmd("Runtime.evaluate", {
            "expression": """
                (function() {
                    const select = document.querySelector('select');
                    if (select) {
                        return Array.from(select.options).map(o => o.text);
                    }
                    return [];
                })()
            """,
            "returnByValue": True
        })
        if 'result' in result and 'result' in result['result']:
            models = result['result']['result'].get('value', [])
            for model in models:
                print(f"  - {model}")

        # Get test cases
        print("\n=== Test Cases ===")
        result = send_cmd("Runtime.evaluate", {
            "expression": "Array.from(document.querySelectorAll('.font-medium')).map(el => el.textContent)",
            "returnByValue": True
        })
        if 'result' in result and 'result' in result['result']:
            test_cases = result['result']['result'].get('value', [])
            for tc in test_cases:
                print(f"  - {tc}")

        # Take screenshot
        print("\n=== Taking screenshot ===")
        result = send_cmd("Page.captureScreenshot", {"format": "png"})
        if 'result' in result and 'data' in result['result']:
            screenshot_data = result['result']['data']
            with open('/tmp/sanitizer-eval-page.png', 'wb') as f:
                f.write(base64.b64decode(screenshot_data))
            print("✓ Screenshot saved to /tmp/sanitizer-eval-page.png")
        else:
            print(f"Screenshot failed: {result}")

        print("\n=== Test Complete ===")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        ws.close()

if __name__ == "__main__":
    main()
