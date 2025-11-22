// AlbinoTiger-Addon/src/actions/paste.js
/**
 * Paste and send functionality
 */

function pasteTextIntoChat(text, autoSend = true) {
    console.log('🐯 AlbinoTiger: ===== ATTEMPTING TO PASTE =====');
    console.log('🐯 AlbinoTiger: Text length:', text.length);
  
    const selectors = [
      '#prompt-textarea',
      'div[id="prompt-textarea"]',
      'div.ProseMirror[contenteditable="true"]',
      'rich-textarea div[contenteditable="true"]',
      'textarea[placeholder*="Ask"]',
      'div[contenteditable="true"][data-placeholder]',
      'div[contenteditable="true"]',
      'div.ProseMirror',
      'textarea[placeholder*="Reply"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="Chat"]',
      'textarea[placeholder*="Type"]',
      'textarea[data-id="root"]',
      'div[role="textbox"]',
      'textarea',
    ];
  
    console.log('🐯 AlbinoTiger: Checking selectors...');
  
    let target = null;
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`🐯 AlbinoTiger: Selector "${selector}" found ${elements.length} elements`);
  
        for (const el of elements) {
          const rect = el.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0;
          const isDisabled = el.disabled || el.getAttribute('aria-disabled') === 'true';
  
          if (isVisible && !isDisabled) {
            target = el;
            console.log('🐯 AlbinoTiger: ✓ Found visible target with selector:', selector);
            break;
          }
        }
        if (target) break;
      } catch (e) {
        console.log(`🐯 AlbinoTiger: Selector "${selector}" failed:`, e.message);
      }
    }
  
    if (!target) {
      console.error('🐯 AlbinoTiger: ✗ Could not find chat input');
      alert('AlbinoTiger Error: Could not find the chat input. Please click on the chat box and try again.');
      return;
    }
  
    console.log('🐯 AlbinoTiger: Target tagName:', target.tagName);
    console.log('🐯 AlbinoTiger: Target contentEditable:', target.contentEditable);
    console.log('🐯 AlbinoTiger: Target id:', target.id);
  
    target.click();
    target.focus();
  
    const isContentEditable = target.contentEditable === 'true' || target.classList.contains('ProseMirror');
    const isTextarea = target.tagName.toLowerCase() === 'textarea';
  
    if (isContentEditable) {
      console.log('🐯 AlbinoTiger: Target is contenteditable');
  
      target.innerHTML = '';
  
      if (target.id === 'prompt-textarea') {
        const p = document.createElement('p');
        p.textContent = text;
        target.appendChild(p);
      } else {
        target.textContent = text;
      }
  
      ['focus', 'input', 'change', 'keydown', 'keyup'].forEach(eventType => {
        target.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
      });
  
      target.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      }));
  
    } else if (isTextarea) {
      console.log('🐯 AlbinoTiger: Target is textarea');
  
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      )?.set;
  
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(target, text);
      } else {
        target.value = text;
      }
  
      ['focus', 'input', 'change', 'keydown', 'keyup'].forEach(eventType => {
        target.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
      });
    } else {
      console.log('🐯 AlbinoTiger: Unknown target type, trying textContent');
      target.textContent = text;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  
    console.log('🐯 AlbinoTiger: ✓ Text pasted successfully');
  
    if (autoSend) {
      console.log('🐯 AlbinoTiger: Attempting to send message...');
      setTimeout(() => {
        sendMessage(target);
      }, 150);
    }
  
    // Reset prompt if Once mode is enabled
    if (state.onceMode) {
      if (state.toggledPrompts.size > 0) {
        state.toggledPrompts.clear();
        renderPromptSelector();
        console.log('🐯 AlbinoTiger: Once mode - prompt reset to None');
      }
      if (state.enabledFiles.size > 0) {
        state.enabledFiles.clear();
        renderSelectedFiles();
        console.log('🐯 AlbinoTiger: Once mode - all files disabled');
      }
      saveState();
    }
  }
  
  function sendMessage(target) {
    console.log('🐯 AlbinoTiger: ===== ATTEMPTING TO SEND =====');
  
    const sendButtonSelectors = [
      'button[data-testid="send-button"]',
      'button[data-testid="composer-send-button"]',
      'form button[type="submit"]',
      'button[aria-label="Send Message"]',
      'button[aria-label="Send message"]',
      'button[aria-label="Submit"]',
      'button.send-button',
      'button[class*="SendButton"]',
      'button[aria-label="Send"]',
      'button[aria-label="send"]',
      'button[type="submit"]',
      'button[class*="send"]',
      'button[class*="Send"]',
      'button svg[class*="icon"]',
    ];
  
    for (const selector of sendButtonSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const btn = el.tagName === 'BUTTON' ? el : el.closest('button');
          if (btn && !btn.disabled && btn.offsetParent !== null) {
            const rect = btn.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              console.log('🐯 AlbinoTiger: Found send button with selector:', selector);
              btn.click();
              console.log('🐯 AlbinoTiger: ✓ Clicked send button');
              return;
            }
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }
  
    const inputContainer = target.closest('form') || target.parentElement?.parentElement?.parentElement;
    if (inputContainer) {
      const nearbyButtons = inputContainer.querySelectorAll('button');
      for (const btn of nearbyButtons) {
        if (!btn.disabled && btn.offsetParent !== null) {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.width < 100 && rect.height > 0) {
            console.log('🐯 AlbinoTiger: Found nearby button, attempting click');
            btn.click();
            console.log('🐯 AlbinoTiger: ✓ Clicked nearby button');
            return;
          }
        }
      }
    }
  
    console.log('🐯 AlbinoTiger: No send button found, simulating Enter key');
  
    const enterDown = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      composed: true,
    });
  
    const enterPress = new KeyboardEvent('keypress', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      composed: true,
    });
  
    const enterUp = new KeyboardEvent('keyup', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      composed: true,
    });
  
    target.dispatchEvent(enterDown);
    target.dispatchEvent(enterPress);
    target.dispatchEvent(enterUp);
  
    console.log('🐯 AlbinoTiger: ✓ Enter key events dispatched');
  }
  
  function clearChatInput() {
    console.log('🐯 AlbinoTiger: ===== CLEARING CHAT INPUT =====');
  
    const selectors = [
      '#prompt-textarea',
      'div[id="prompt-textarea"]',
      'div.ProseMirror[contenteditable="true"]',
      'rich-textarea div[contenteditable="true"]',
      'textarea[placeholder*="Ask"]',
      'div[contenteditable="true"][data-placeholder]',
      'div[contenteditable="true"]',
      'div.ProseMirror',
      'textarea[placeholder*="Reply"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="Chat"]',
      'textarea[placeholder*="Type"]',
      'textarea[data-id="root"]',
      'div[role="textbox"]',
      'textarea',
    ];
  
    let target = null;
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            target = el;
            break;
          }
        }
        if (target) break;
      } catch (e) {
        continue;
      }
    }
  
    if (!target) {
      console.log('🐯 AlbinoTiger: No chat input found to clear');
      return;
    }
  
    target.click();
    target.focus();
  
    const isContentEditable = target.contentEditable === 'true' || target.classList.contains('ProseMirror');
    const isTextarea = target.tagName.toLowerCase() === 'textarea';
  
    if (isContentEditable) {
      target.innerHTML = '';
      if (target.id === 'prompt-textarea') {
        target.innerHTML = '<p><br></p>';
      }
    } else if (isTextarea) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(target, '');
      } else {
        target.value = '';
      }
    } else {
      target.textContent = '';
    }
  
    ['focus', 'input', 'change'].forEach(eventType => {
      target.dispatchEvent(new Event(eventType, { bubbles: true }));
    });
  
    console.log('🐯 AlbinoTiger: ✓ Chat input cleared');
  }