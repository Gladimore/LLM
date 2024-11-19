// public/text.js

let userPassword = null; // Store the password in a variable

// Fetch allowed text models from the server
const fetchModels = async () => {
  try {
    const response = await fetch('/api/models');
    const data = await response.json();

    populateModelSelect('model-select', data.textModels;
    loadCustomSettingsText();
  } catch (error) {
    console.error('Error fetching models:', error);
    alert('Failed to load models.');
  }
};

// Populate model selection dropdown
const populateModelSelect = (elementId, models) => {
  const select = document.getElementById(elementId);
  select.innerHTML = ''; // Clear existing options

  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    select.appendChild(option);
  });
};

// Load Custom Settings for Text Page
const loadCustomSettingsText = () => {
  const settings = JSON.parse(localStorage.getItem('customSettings'));

  if (settings && settings.textModel) {
    const textModelSelect = document.getElementById('model-select');
    textModelSelect.value = settings.textModel;
  }
};

// Load chat history from local storage (limit to 10)
let chatHistory = JSON.parse(localStorage.getItem('chatHistoryText')) || [];

// Function to update the UI with chat history
const updateChatHistoryUI = () => {
  const textResponse = document.getElementById('text-response');
  textResponse.innerHTML = ''; // Clear existing content

  chatHistory.forEach((entry, index) => {
    // User Prompt
    const userPrompt = document.createElement('p');
    userPrompt.innerHTML = `<strong>User:</strong> ${entry.prompt}`;
    textResponse.appendChild(userPrompt);

    // Assistant Response
    const assistantResponse = document.createElement('p');
    assistantResponse.innerHTML = `<strong>Assistant:</strong> ${entry.response}`;
    textResponse.appendChild(assistantResponse);

    // Copy/Download Buttons for Each Message
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'copy-download-buttons mb-3';

    // Copy Button
    const copyButton = document.createElement('button');
    copyButton.className = 'btn btn-primary btn-sm me-2 copy';
    copyButton.textContent = 'Copy';
    copyButton.addEventListener('click', () => {
      const textToCopy = `User: ${entry.prompt}\nAssistant: ${entry.response}`;
      navigator.clipboard.writeText(textToCopy)
        .then(() => alert('Text copied to clipboard!'))
        .catch(err => console.error('Could not copy text: ', err));
    });
    buttonContainer.appendChild(copyButton);

    // Download Button
    const downloadButton = document.createElement('button');
    downloadButton.className = 'btn btn-success btn-sm download';
    downloadButton.textContent = 'Download';
    downloadButton.addEventListener('click', () => {
      const textToDownload = `User: ${entry.prompt}\nAssistant: ${entry.response}`;
      const blob = new Blob([textToDownload], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat_history_${index + 1}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    buttonContainer.appendChild(downloadButton);

    textResponse.appendChild(buttonContainer);
  });
};

// Initialize chat history UI
updateChatHistoryUI();

// Handle password submission
document.getElementById('submit-password').addEventListener('click', () => {
  const passwordInput = document.getElementById('password-input').value;
  if (passwordInput) {
    userPassword = passwordInput;
    document.getElementById('generate-text').disabled = false;
    document.getElementById('copy-text').disabled = false;
    document.getElementById('download-text').disabled = false;
    // Optionally, hide or disable the password input
    document.getElementById('password-input').disabled = true;
    document.getElementById('submit-password').disabled = true;
  } else {
    alert('Please enter a password.');
  }
});

// Generate Text Button Click
document.getElementById('generate-text').addEventListener('click', async () => {
  const prompt = document.getElementById('text-prompt').value.trim();
  const model = document.getElementById('model-select').value;

  if (!prompt) {
    alert('Please enter a prompt.');
    return;
  }

  if (!userPassword) {
    alert('Please enter your password.');
    return;
  }

  // Show loading indicator

  // Prepare the chat history (last 10 entries)
  const limitedChatHistory = chatHistory.slice(-10).map(entry => ({
    prompt: entry.prompt,
    response: entry.response,
  }));

  try {
    const response = await fetch('/api/generate-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model,
        password: userPassword,
        chatHistory: limitedChatHistory
      }),
    });

    const result = await response.json();

    if (result.success) {
      const generatedText = result.data;
      // Update chat history
      chatHistory.push({ prompt, response: generatedText });
      // Ensure chat history does not exceed 10 entries
      if (chatHistory.length > 10) {
        chatHistory = chatHistory.slice(-10);
      }
      // Save updated chat history to localStorage
      localStorage.setItem('chatHistoryText', JSON.stringify(chatHistory));
      // Update UI
      updateChatHistoryUI();
      // Clear the prompt
      document.getElementById('text-prompt').value = '';
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred while generating text.');
  }
});

// Copy All Text Button Click
document.getElementById('copy-text').addEventListener('click', () => {
  const text = document.getElementById('text-response').innerText;
  if (text) {
    navigator.clipboard.writeText(text)
      .then(() => alert('All text copied to clipboard!'))
      .catch(err => console.error('Could not copy text: ', err));
  } else {
    alert('No text to copy.');
  }
});

// Download All Text Button Click
document.getElementById('download-text').addEventListener('click', () => {
  const text = document.getElementById('text-response').innerText;
  if (text) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_history.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    alert('No text to download.');
  }
});

// Initialize the Text Page
fetchModels();
