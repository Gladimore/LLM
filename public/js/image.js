// public/image.js

let userPasswordImage = null; // Store the password in a variable

// Fetch allowed image models from the server
const fetchModels = async () => {
  try {
    const response = await fetch('/api/models');
    const data = await response.json();

    populateModelSelect('model-select-image', data.imageModels);
    loadCustomSettingsImage();
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

// Load Custom Settings for Image Page
const loadCustomSettingsImage = () => {
  const settings = JSON.parse(localStorage.getItem('customSettings'));

  if (settings) {
    if (settings.imageWidth) {
      document.getElementById('image-width').value = settings.imageWidth;
    }
    if (settings.imageHeight) {
      document.getElementById('image-height').value = settings.imageHeight;
    }
    if (settings.imageModel) {
      const imageModelSelect = document.getElementById('model-select-image');
      imageModelSelect.value = settings.imageModel;
    }
  }
};

// Load image chat history from local storage (limit to 10)
let chatHistoryImage = JSON.parse(localStorage.getItem('chatHistoryImage')) || [];

// Function to update the UI with image history
const updateImageHistoryUI = () => {
  const imageContainer = document.getElementById('image-container');
  imageContainer.innerHTML = ''; // Clear existing images

  chatHistoryImage.forEach((entry, index) => {
    // User Prompt
    const promptElement = document.createElement('p');
    promptElement.innerHTML = `<strong>User:</strong> ${entry.prompt}`;
    imageContainer.appendChild(promptElement);

    // Generated Images
    entry.images.forEach((imgBase64, imgIndex) => {
      const imgElement = document.createElement('img');
      imgElement.src = `data:image/png;base64,${imgBase64}`;
      imgElement.alt = `Generated Image ${imgIndex + 1}`;
      imageContainer.appendChild(imgElement);
    });

    // Copy/Download Buttons for Each Image Set
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'copy-download-buttons mb-3';

    // Copy Button
    const copyButton = document.createElement('button');
    copyButton.className = 'btn btn-primary btn-sm me-2 copy';
    copyButton.textContent = 'Copy';
    copyButton.addEventListener('click', () => {
      const imagesData = entry.images.map((img, idx) => `Image ${idx + 1}: data:image/png;base64,${img}`).join('\n');
      navigator.clipboard.writeText(`User: ${entry.prompt}\nAssistant Images:\n${imagesData}`)
        .then(() => alert('Image data copied to clipboard!'))
        .catch(err => console.error('Could not copy image data: ', err));
    });
    buttonContainer.appendChild(copyButton);

    // Download Button
    const downloadButton = document.createElement('button');
    downloadButton.className = 'btn btn-success btn-sm download';
    downloadButton.textContent = 'Download';
    downloadButton.addEventListener('click', () => {
      entry.images.forEach((imgBase64, imgIndex) => {
        const blob = b64toBlob(imgBase64, 'image/png');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `generated_image_${index + 1}_${imgIndex + 1}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    });
    buttonContainer.appendChild(downloadButton);

    imageContainer.appendChild(buttonContainer);
  });
};

// Utility function to convert base64 to Blob
function b64toBlob(b64Data, contentType = '', sliceSize = 512) {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, { type: contentType });
  return blob;
};

// Initialize image history UI
updateImageHistoryUI();

// Handle password submission
document.getElementById('submit-password-image').addEventListener('click', () => {
  const passwordInput = document.getElementById('password-input-image').value;
  if (passwordInput) {
    userPasswordImage = passwordInput;
    document.getElementById('generate-image').disabled = false;
    document.getElementById('copy-image-url').disabled = false;
    document.getElementById('download-image').disabled = false;
    // Optionally, hide or disable the password input
    document.getElementById('password-input-image').disabled = true;
    document.getElementById('submit-password-image').disabled = true;
  } else {
    alert('Please enter a password.');
  }
});

// Generate Image Button Click
document.getElementById('generate-image').addEventListener('click', async () => {
  const prompt = document.getElementById('image-prompt').value.trim();
  const model = document.getElementById('model-select-image').value;
  const width = parseInt(document.getElementById('image-width').value) || 1024;
  const height = parseInt(document.getElementById('image-height').value) || 768;

  if (!prompt) {
    alert('Please enter a prompt.');
    return;
  }

  if (!userPasswordImage) {
    alert('Please enter your password.');
    return;
  }

  // Show loading indicator
  document.getElementById('loading-image').style.display = 'block';

  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model,
        width,
        height,
        password: userPasswordImage
      }),
    });

    const result = await response.json();

    if (result.success) {
      const images = result.data; // Array of base64 strings
      // Update image chat history
      chatHistoryImage.push({ prompt, images });
      // Ensure chat history does not exceed 10 entries
      if (chatHistoryImage.length > 10) {
        chatHistoryImage = chatHistoryImage.slice(-10);
      }
      // Save updated chat history to localStorage
      localStorage.setItem('chatHistoryImage', JSON.stringify(chatHistoryImage));
      // Update UI
      updateImageHistoryUI();
      // Clear the prompt
      document.getElementById('image-prompt').value = '';
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred while generating image.');
  } finally {
    // Hide loading indicator
    document.getElementById('loading-image').style.display = 'none';
  }
});

// Copy All Image URLs Button Click
document.getElementById('copy-image-url').addEventListener('click', () => {
  const imageContainer = document.getElementById('image-container');
  const images = imageContainer.getElementsByTagName('img');

  if (images.length === 0) {
    alert('No images to copy.');
    return;
  }

  let imageUrls = '';
  chatHistoryImage.forEach(entry => {
    imageUrls += `User: ${entry.prompt}\nAssistant Images:\n`;
    entry.images.forEach((img, idx) => {
      imageUrls += `Image ${idx + 1}: data:image/png;base64,${img}\n`;
    });
    imageUrls += '\n';
  });

  navigator.clipboard.writeText(imageUrls)
    .then(() => alert('All image URLs copied to clipboard!'))
    .catch(err => console.error('Could not copy image URLs: ', err));
});

// Download All Images Button Click
document.getElementById('download-image').addEventListener('click', () => {
  const imageContainer = document.getElementById('image-container');
  const images = imageContainer.getElementsByTagName('img');

  if (images.length === 0) {
    alert('No images to download.');
    return;
  }

  chatHistoryImage.forEach((entry, index) => {
    entry.images.forEach((imgBase64, imgIndex) => {
      const blob = b64toBlob(imgBase64, 'image/png');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated_image_${index + 1}_${imgIndex + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  });

  alert('All images have been downloaded.');
});

// Initialize the Image Page
fetchModels();
