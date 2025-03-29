// src/app.ts
import { Capacitor } from '@capacitor/core';
import { Http } from '@capacitor/http';

/**
 * Complete Capacitor Blob ResponseType Bug Reproduction
 * 
 * This demonstrates the issue where Android returns strings for blob responses
 * while web returns proper Blob objects as expected.
 */

// Helper to create a mock MP3 file (binary data)
function createMockMP3Data(size: number = 1024): Uint8Array {
  // Create some fake MP3 data with proper header
  // Real MP3 starts with ID3 tag or sync word 0xFF 0xFB
  const data = new Uint8Array(size);
  
  // Set ID3 header (ID3v2 tag)
  data[0] = 0x49; // 'I'
  data[1] = 0x44; // 'D'
  data[2] = 0x33; // '3'
  data[3] = 0x03; // version 3
  data[4] = 0x00; // revision 0
  data[5] = 0x00; // flags
  
  // Fill rest with random data
  for (let i = 6; i < size; i++) {
    data[i] = Math.floor(Math.random() * 256);
  }
  
  return data;
}

// Create a blob URL from binary data to use as mock API
function setupMockAudioEndpoint(): string {
  const mp3Data = createMockMP3Data();
  const blob = new Blob([mp3Data], { type: 'audio/mpeg' });
  return URL.createObjectURL(blob);
}

// Log to both console and UI
function log(message: string, isError: boolean = false) {
  console.log(message);
  
  const resultDisplay = document.getElementById('result-display');
  if (resultDisplay) {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.textContent = message;
    
    if (isError) {
      logEntry.style.color = 'red';
    }
    
    resultDisplay.appendChild(logEntry);
  }
}

// Function to test both XMLHttpRequest (web) and Capacitor HTTP (native)
async function testBlobHandling() {
  const mockAudioUrl = setupMockAudioEndpoint();
  
  const resultDisplay = document.getElementById('result-display');
  if (resultDisplay) {
    resultDisplay.innerHTML = '';
  }
  
  log("=== CAPACITOR BUG REPRODUCTION ===");
  log(`Platform: ${Capacitor.getPlatform()}`);
  
  // Test 1: Using Capacitor HTTP plugin
  try {
    log("\n=== TEST 1: Using Capacitor HTTP plugin ===");
    const response = await Http.request({
      method: 'GET',
      url: mockAudioUrl,
      responseType: 'blob'
    });
    
    log(`Response data type: ${typeof response.data}`);
    log(`Response data instanceof Blob: ${response.data instanceof Blob}`);
    
    if (typeof response.data === 'string') {
      log(`String response length: ${response.data.length}`);
      
      // Show first few bytes in hex format
      let hexPreview = '';
      for (let i = 0; i < Math.min(20, response.data.length); i++) {
        hexPreview += response.data.charCodeAt(i).toString(16).padStart(2, '0') + ' ';
      }
      log(`First 20 bytes (hex): ${hexPreview}`);
      
      // Try to convert the string back to a blob (only needed on Android)
      try {
        // Convert binary string to array buffer
        const binaryString = response.data;
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create blob from array buffer
        const recoveredBlob = new Blob([bytes.buffer], { type: 'audio/mpeg' });
        log(`Recovered blob size: ${recoveredBlob.size}`);
        
        // Create audio element from recovered blob
        const audioUrl = URL.createObjectURL(recoveredBlob);
        log(`Recovered audio URL: ${audioUrl}`);
        
        // Add audio player to UI
        const audioElement = document.createElement('audio');
        audioElement.controls = true;
        audioElement.src = audioUrl;
        
        if (resultDisplay) {
          const audioContainer = document.createElement('div');
          audioContainer.style.margin = '10px 0';
          audioContainer.appendChild(audioElement);
          resultDisplay.appendChild(audioContainer);
        }
      } catch (e) {
        log(`Error recovering blob from string: ${e}`, true);
      }
    } else if (response.data instanceof Blob) {
      log(`Blob size: ${response.data.size}`);
      log(`Blob type: ${response.data.type}`);
      
      // Create audio element from blob
      const audioUrl = URL.createObjectURL(response.data);
      log(`Audio URL: ${audioUrl}`);
      
      // Add audio player to UI
      const audioElement = document.createElement('audio');
      audioElement.controls = true;
      audioElement.src = audioUrl;
      
      if (resultDisplay) {
        const audioContainer = document.createElement('div');
        audioContainer.style.margin = '10px 0';
        audioContainer.appendChild(audioElement);
        resultDisplay.appendChild(audioContainer);
      }
    }
  } catch (error) {
    log(`Error in Capacitor HTTP test: ${error}`, true);
  }
  
  // Test 2: Using standard XMLHttpRequest for comparison
  try {
    log("\n=== TEST 2: Using standard XMLHttpRequest ===");
    const xhr = new XMLHttpRequest();
    xhr.open('GET', mockAudioUrl);
    xhr.responseType = 'blob';
    
    const xhrPromise = new Promise<void>((resolve, reject) => {
      xhr.onload = function() {
        if (xhr.status === 200) {
          const responseData = xhr.response;
          
          log(`XHR response data type: ${typeof responseData}`);
          log(`XHR response instanceof Blob: ${responseData instanceof Blob}`);
          
          if (responseData instanceof Blob) {
            log(`XHR blob size: ${responseData.size}`);
            log(`XHR blob type: ${responseData.type}`);
            
            // Create audio element from blob
            const audioUrl = URL.createObjectURL(responseData);
            log(`XHR audio URL: ${audioUrl}`);
            
            // Add audio player to UI
            const audioElement = document.createElement('audio');
            audioElement.controls = true;
            audioElement.src = audioUrl;
            
            if (resultDisplay) {
              const audioContainer = document.createElement('div');
              audioContainer.style.margin = '10px 0';
              audioContainer.appendChild(audioElement);
              resultDisplay.appendChild(audioContainer);
            }
          }
          resolve();
        } else {
          reject(new Error(`XHR error: ${xhr.status}`));
        }
      };
      
      xhr.onerror = function() {
        reject(new Error('XHR network error'));
      };
    });
    
    xhr.send();
    await xhrPromise;
  } catch (error) {
    log(`Error in XMLHttpRequest test: ${error}`, true);
  }
  
  // Clean up the object URL
  URL.revokeObjectURL(mockAudioUrl);
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  // Display platform info
  const platformInfo = document.getElementById('platform-info');
  if (platformInfo) {
    platformInfo.textContent = `Current platform: ${Capacitor.getPlatform()}`;
  }
  
  // Set up test button
  const testButton = document.getElementById('test-button');
  if (testButton) {
    testButton.addEventListener('click', testBlobHandling);
  }
});