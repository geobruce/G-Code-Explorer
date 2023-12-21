/*!
 * -------------------------------------------------------------------------------------
 * G-Code Visualizer & Analyzer
 * -------------------------------------------------------------------------------------
 * Author: [Bruce Helsen]
 * Date: [21/12/2023]
 * Version: 0.0.1
 * 
 * Description:
 * This web application is designed to interpret and visualize G-code data,
 * providing insights through an interactive interface. Users can upload G-code
 * files, analyze tool paths, and explore various metrics for in-depth understanding.
 * 
 * Features:
 * - Drag-and-drop file upload
 * - Dynamic G-code parsing
 * - Collapsible tool information sections
 * - Tool usage summary table with filtering options
 * 
 * -------------------------------------------------------------------------------------
 * (c) [2023] [Bruce Helsen] | [...]
 * -------------------------------------------------------------------------------------
 */


// Select the drop area
const dropArea = document.getElementById('drop-area');

// Prevent default behaviors for drag-and-drop events
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, preventDefaults, false);
  document.body.addEventListener(eventName, preventDefaults, false);
});

// Highlight drop area when item is dragged over it
['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, unhighlight, false);
});

// Handle dropped files
dropArea.addEventListener('drop', handleDrop, false);

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function highlight() {
  dropArea.classList.add('highlight');
}

function unhighlight() {
  dropArea.classList.remove('highlight');
}

function handleDrop(e) {
  var dt = e.dataTransfer;
  var files = dt.files;

  handleFiles(files);
}

function handleFiles(files) {
  ([...files]).forEach(readFile);
}

// Global array to hold data from all files
let allToolChanges = [];

function readFile(file) {
  let reader = new FileReader();
  reader.readAsText(file);
  reader.onloadend = function() {
    // Parse the current file and add its data to the global array
    const toolChanges = parseGCode(reader.result);
    allToolChanges.push({
      fileName: file.name,
      toolChanges: toolChanges
    });
    updateUI(allToolChanges); // Update the UI with all accumulated data
  }
}


function parseGCode(text) {
    const lines = text.split('\n');
    let toolChanges = [];
    let currentTool = null;
    let feedRates = [];
    let lastRpm = null;
    let rpmFeedRates = {};  // To store feed rates for each RPM
  
    lines.forEach((line) => {
      // Check for tool change
      let toolChangeMatch = line.match(/G00 T(\d+) \/\/(.+)/);
      if (toolChangeMatch) {
        if (currentTool) {
          toolChanges.push({
            tool: currentTool,
            rpmFeedRates: {...rpmFeedRates}  // Copy the rpmFeedRates object
          });
        }
        // Reset for the new tool
        currentTool = {
          number: parseInt(toolChangeMatch[1]),
          name: toolChangeMatch[2].trim()
        };
        feedRates = [];
        rpmFeedRates = {};
        rpmFeedRates[lastRpm] = [];  // Initialize with the last known RPM
      }
  
      // Check for feed rate
      let feedRateMatch = line.match(/F(\d+\.?\d*)/);
      if (feedRateMatch) {
        feedRates.push(parseFloat(feedRateMatch[1]));
        if (rpmFeedRates[lastRpm] == null) {
          rpmFeedRates[lastRpm] = [];
        }
        rpmFeedRates[lastRpm].push(parseFloat(feedRateMatch[1]));  // Associate with current RPM
      }
  
      // Check for RPM line and update lastRpm
      let rpmMatch = line.match(/G97 S(\d+)/);
      if (rpmMatch) {
        lastRpm = parseInt(rpmMatch[1]);
        if (!rpmFeedRates[lastRpm]) {
          rpmFeedRates[lastRpm] = [];  // Initialize array for new RPM
        }
      }
    });
  
    // Add the last tool's data if it exists
    if (currentTool) {
      toolChanges.push({
        tool: currentTool,
        rpmFeedRates: rpmFeedRates
      });
    }
  
    return toolChanges;
  }
  
function updateUI(allToolChanges) {
    const summaryTable = document.getElementById('summary-table');
    const detailsDiv = document.getElementById('details');
  
    // Clear previous data
    summaryTable.innerHTML = '';
    detailsDiv.innerHTML = '';
  
    // Create and append the header row for the summary table
    let headerRow = summaryTable.insertRow(-1);
   //let headers = ["Gcode File Name", "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T31", "T32", "T33", "T34", "T41", "T99"];
  // Create headers for T1 up to T100
  let headers = ["Gcode File Name"];
  for (let i = 1; i <= 100; i++) {
    headers.push(`T${i}`);
  }

    headers.forEach(header => headerRow.insertCell(-1).innerText = header);
  
    // Process each file's tool changes
    allToolChanges.forEach(fileData => {
      let row = summaryTable.insertRow(-1);
      row.insertCell(-1).innerText = fileData.fileName;
  
      for (let i = 1; i < headers.length; i++) {
        row.insertCell(-1);
      }
  
      fileData.toolChanges.forEach(change => {
        let toolIndex = headers.indexOf(`T${change.tool.number}`);
        if (toolIndex !== -1) {
          row.cells[toolIndex].innerText = change.tool.name;
        }
      });
  
      let fileButton = document.createElement('button');
      fileButton.className = 'collapsible';
      fileButton.innerText = fileData.fileName;
      detailsDiv.appendChild(fileButton);
  
      let fileContentDiv = document.createElement('div');
      fileContentDiv.className = 'content';
      detailsDiv.appendChild(fileContentDiv);
  
      fileData.toolChanges.forEach(change => {
        let toolButton = document.createElement('button');
        toolButton.className = 'collapsible collapsible-tool';
        toolButton.innerText = `Tool ${change.tool.number}: ${change.tool.name}`;
        fileContentDiv.appendChild(toolButton);
  
        // let toolContentDiv = document.createElement('div');
        // toolContentDiv.className = 'content';
        // fileContentDiv.appendChild(toolContentDiv);
  
        // // Add additional UI update code here if necessary

        /* bruce */
        let toolContentDiv = document.createElement('div');
        toolContentDiv.className = 'content';
        let contentHTML = ""; //`<p>Last RPM: ${Object.keys(change.rpmFeedRates).pop() || 'N/A'}</p>`; // Show the last RPM for reference
  
        // Iterate over each RPM and list feed rates
        for (const [rpm, rates] of Object.entries(change.rpmFeedRates)) {
          if (rates.length > 0) {
            contentHTML += `<p>Full Feed Rates @ ${rpm} RPM: `;
            rates.forEach(rate => {
              let color = `hsl(${360 * rates.indexOf(rate) / rates.length}, 70%, 60%)`;  // Color coding for readability
              contentHTML += `<span style="color: ${color};">${rate}</span>, `;
            });
            contentHTML = contentHTML.replace(/, $/, '') + '</p>';  // Remove trailing comma
          }
        }
  
        toolContentDiv.innerHTML = contentHTML;
        fileContentDiv.appendChild(toolContentDiv);
      });
    });
  
    // Activate collapsible functionality for all collapsible elements
    var collapsibles = document.getElementsByClassName("collapsible");
    for (let i = 0; i < collapsibles.length; i++) {
      collapsibles[i].addEventListener("click", function() {
        this.classList.toggle("active");
        var content = this.nextElementSibling;
        if (content.style.display === "block") {
          content.style.display = "none";
        } else {
          content.style.display = "block";
        }
      });
    }
  
    // Call the function to apply the initial filter based on the default checked radio
    filterTable();
  }
  
  function filterTable() {
    const toolFilter = document.querySelector('input[name="toolFilter"]:checked').value;
    const table = document.getElementById('summary-table');
    const allColumns = Array.from(table.rows[0].cells).map((_, i) => i);
  
    // Define the column indexes for Apex 3R tools (adjust these as needed)
    const apex3RTools = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 31, 32, 33, 34, 41, 99]; // +1 to account for the first column
  
    let columnsToShow;
    if (toolFilter === 'usedTools') {
      columnsToShow = allColumns.filter(index => {
        return index === 0 || // Always include the first column
          Array.from(table.rows).some((row, rowIndex) => {
            return rowIndex > 0 && row.cells[index] && row.cells[index].innerText.trim() !== '';
          });
      });
    } else if (toolFilter === 'apex3RTools') {
      columnsToShow = [0].concat(apex3RTools); // Always include the first column
    } else { // allTools
      columnsToShow = allColumns.slice(0, 101); // Including the first column
    }
  
    Array.from(table.rows).forEach(row => {
      allColumns.forEach(index => {
        if (row.cells[index]) {
          row.cells[index].style.display = columnsToShow.includes(index) ? '' : 'none';
        }
      });
    });
  }
  
  document.querySelectorAll('input[name="toolFilter"]').forEach((radio) => {
    radio.addEventListener('change', filterTable);
  });
  

