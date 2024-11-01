// public/settings.js

// Fetch allowed models from the server
const fetchModels = async () => {
  try {
    const response = await fetch('/api/models');
    const data = await response.json();

    populateModelSelect('text-model-select', data.textModels.map(m => m.name));
    populateModelSelect('image-model-select', data.imageModels.map(m => m.name));
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

// Handle Reset Chat History Buttons
document.getElementById('reset-chat-text').addEventListener('click', () => {
  if (confirm('Are you sure you want to reset your text chat history? This action cannot be undone.')) {
    localStorage.removeItem('chatHistoryText');
    alert('Text chat history has been reset.');
  }
});

document.getElementById('reset-chat-image').addEventListener('click', () => {
  if (confirm('Are you sure you want to reset your image chat history? This action cannot be undone.')) {
    localStorage.removeItem('chatHistoryImage');
    alert('Image chat history has been reset.');
  }
});

// Handle Custom Settings Form Submission
document.getElementById('custom-settings-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const imageWidth = document.getElementById('image-width').value;
  const imageHeight = document.getElementById('image-height').value;
  const textModel = document.getElementById('text-model-select').value;
  const imageModel = document.getElementById('image-model-select').value;

  const settings = {
    imageWidth: parseInt(imageWidth),
    imageHeight: parseInt(imageHeight),
    textModel: textModel,
    imageModel: imageModel
  };

  localStorage.setItem('customSettings', JSON.stringify(settings));
  alert('Settings have been saved.');
});

// Load Custom Settings if Available
const loadCustomSettings = () => {
  const settings = JSON.parse(localStorage.getItem('customSettings'));

  if (settings) {
    document.getElementById('image-width').value = settings.imageWidth;
    document.getElementById('image-height').value = settings.imageHeight;

    const textModelSelect = document.getElementById('text-model-select');
    if (textModelSelect) {
      textModelSelect.value = settings.textModel;
    }

    const imageModelSelect = document.getElementById('image-model-select');
    if (imageModelSelect) {
      imageModelSelect.value = settings.imageModel;
    }
  }
};

// Initialize the Settings Page
const initSettingsPage = async () => {
  await fetchModels();
  loadCustomSettings();
};

initSettingsPage();