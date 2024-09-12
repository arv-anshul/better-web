// Fetch the mappings from the JSON file
let cssMappings = [];

fetch(chrome.runtime.getURL("mappings.json"))
  .then((response) => response.json())
  .then((data) => {
    cssMappings = data.mappings;
  })
  .catch((error) => console.error("Error loading JSON mappings:", error));

// Function to inject CSS based on URL
function injectCSS(tabId, url) {
  // Loop through the mappings and check for URL matches using regex
  cssMappings.forEach((mapping) => {
    mapping.urlPatterns.forEach((urlRegexStr) => {
      const regex = new RegExp(urlRegexStr);

      // If the URL matches the regex pattern, inject the CSS files
      if (regex.test(url)) {
        mapping.cssFiles.forEach((cssFile) => {
          chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: [cssFile],
          });
        });
      }
    });
  });
}

// Listen for tab updates and apply CSS based on the URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    injectCSS(tabId, tab.url);
  }
});
