// script.js
const BUCKET_TYPES = {
  checking: { emoji: "🏦", name: "Checking" },
  savings: { emoji: "💰", name: "Savings" },
  emergency: { emoji: "🚨", name: "Emergency" },
  debt: { emoji: "💳", name: "Debt" },
  retirement: { emoji: "🏖️", name: "Retirement" },
  investment: { emoji: "📈", name: "Investment" },
  house: { emoji: "🏠", name: "House" },
  vacation: { emoji: "✈️", name: "Vacation" },
  car: { emoji: "🚗", name: "Car" },
  education: { emoji: "🎓", name: "Education" },
  health: { emoji: "⚕️", name: "Health" },
  other: { emoji: "📦", name: "Other" },
};

let buckets = [];
let draggedIndex = null;
let currentView = "list";
let wizardData = {
  currentStep: 0,
  monthlyExpenses: 0,
  hasDebts: false,
  hasRetirement: false,
  goals: [],
};

// Load from localStorage
function loadData() {
  const saved = localStorage.getItem("bucketFinanceData");
  if (saved) {
    try {
      buckets = JSON.parse(saved);
      render();
    } catch (e) {
      console.error("Failed to load saved data");
    }
  }
}

// Save to localStorage
function saveData() {
  if (buckets.length > 0) {
    localStorage.setItem("bucketFinanceData", JSON.stringify(buckets));
  } else {
    localStorage.removeItem("bucketFinanceData");
  }
}

function closeInfo() {
  document.getElementById("infoPanel").style.display = "none";
}

function addBucket() {
  buckets.push({
    name: "",
    current: 0,
    desired: 0,
    description: "",
    type: "other",
  });
  saveData();
  render();
}

function loadExample() {
  buckets = [
    {
      name: "Checking Buffer",
      current: 3200,
      desired: 3000,
      description: "2 months expenses ($1,500/mo)",
      type: "checking",
    },
    {
      name: "Emergency Fund",
      current: 2500,
      desired: 4500,
      description: "3 months expenses goal",
      type: "emergency",
    },
    {
      name: "Credit Card 1",
      current: -850,
      desired: 0,
      description: "18% APR - High interest",
      type: "debt",
    },
    {
      name: "Credit Card 2",
      current: -1234,
      desired: 0,
      description: "22% APR - Highest interest",
      type: "debt",
    },
    {
      name: "Car Loan",
      current: -8500,
      desired: 0,
      description: "5.5% APR - Moderate interest",
      type: "debt",
    },
    {
      name: "Roth IRA (2024)",
      current: 3400,
      desired: 7000,
      description: "Annual contribution limit",
      type: "retirement",
    },
    {
      name: "Student Loan",
      current: -15000,
      desired: 0,
      description: "4.2% APR - Moderate interest",
      type: "debt",
    },
    {
      name: "401k (2024)",
      current: 5000,
      desired: 11250,
      description: "15% of $75k income",
      type: "retirement",
    },
    {
      name: "Vacation Fund",
      current: 500,
      desired: 3000,
      description: "Europe trip savings",
      type: "vacation",
    },
    {
      name: "House Down Payment",
      current: 12000,
      desired: 50000,
      description: "20% down on $250k home",
      type: "house",
    },
  ];
  saveData();
  render();
}

function clearAll() {
  if (confirm("Clear all buckets? This cannot be undone.")) {
    buckets = [];
    localStorage.removeItem("bucketFinanceData");
    render();
  }
}

function removeBucket(index) {
  buckets.splice(index, 1);
  saveData();
  render();
}

function updateBucket(index, field, value) {
  if (field === "current" || field === "desired") {
    buckets[index][field] = parseFloat(value) || 0;
  } else {
    buckets[index][field] = value;
  }
  saveData();
  render();
}

function toggleBucketTypeSelector(index) {
  const selector = document.getElementById(`type-selector-${index}`);
  // Close all other selectors
  document.querySelectorAll(".bucket-type-selector").forEach((s) => {
    if (s !== selector) s.classList.remove("active");
  });
  selector.classList.toggle("active");
}

function selectBucketType(index, type) {
  buckets[index].type = type;
  saveData();
  render();
}

// Close type selectors when clicking outside
document.addEventListener("click", (e) => {
  if (
    !e.target.closest(".bucket-number") &&
    !e.target.closest(".bucket-type-selector")
  ) {
    document.querySelectorAll(".bucket-type-selector").forEach((s) => {
      s.classList.remove("active");
    });
  }
  // Close export menu when clicking outside
  if (!e.target.closest(".export-dropdown")) {
    document.getElementById("exportMenu").classList.remove("active");
  }
});

// Export Functions
function toggleExportMenu() {
  event.stopPropagation();
  document.getElementById("exportMenu").classList.toggle("active");
}

function exportToCSV() {
  const flows = calculateFlow();
  let csv =
    "Bucket Number,Bucket Name,Type,Current Amount,Goal Amount,Description,Amount to Move,Status\n";

  flows.forEach((flow, index) => {
    const status = flow.isComplete ? "Complete" : "In Progress";
    const type = BUCKET_TYPES[flow.type]?.name || "Other";
    csv += `${index + 1},"${flow.name}","${type}",${flow.current},${
      flow.desired
    },"${flow.description || ""}",${flow.amountToMove},"${status}"\n`;
  });

  downloadFile(csv, "bucket-finance-flow.csv", "text/csv");
  document.getElementById("exportMenu").classList.remove("active");
}

function exportToJSON() {
  const data = {
    exportDate: new Date().toISOString(),
    buckets: buckets,
    flows: calculateFlow(),
  };
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, "bucket-finance-flow.json", "application/json");
  document.getElementById("exportMenu").classList.remove("active");
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// View Switching
function switchView(view) {
  currentView = view;
  document
    .getElementById("listViewBtn")
    .classList.toggle("active", view === "list");
  document
    .getElementById("visualViewBtn")
    .classList.toggle("active", view === "visual");

  if (view === "list") {
    document.getElementById("bucketsContainer").style.display = "block";
    document.getElementById("visualSummary").style.display = "none";
    document.getElementById("summary").style.display = "block";
  } else {
    document.getElementById("bucketsContainer").style.display = "none";
    document.getElementById("visualSummary").style.display = "block";
    document.getElementById("summary").style.display = "none";
    renderVisualSummary();
  }
}

function renderVisualSummary() {
  if (buckets.length === 0) return;

  const flows = calculateFlow();
  const completeCount = flows.filter((f) => f.isComplete).length;
  const completionPercentage = ((completeCount / flows.length) * 100).toFixed(
    0
  );

  // Update completion ring
  const circumference = 2 * Math.PI * 65;
  const offset = circumference - (completionPercentage / 100) * circumference;
  document.getElementById("ringProgress").style.strokeDashoffset = offset;
  document.getElementById("ringPercentage").textContent =
    completionPercentage + "%";

  // Category breakdown
  const categories = {};
  flows.forEach((flow) => {
    const type = flow.type || "other";
    if (!categories[type]) {
      categories[type] = { total: 0, count: 0 };
    }
    categories[type].total += Math.abs(flow.current);
    categories[type].count++;
  });

  let categoryHTML = "";
  Object.keys(categories).forEach((type) => {
    const typeInfo = BUCKET_TYPES[type] || BUCKET_TYPES.other;
    categoryHTML += `
                    <div class="category-card">
                        <div class="category-icon">${typeInfo.emoji}</div>
                        <div class="category-label">${typeInfo.name}</div>
                        <div class="category-value">${categories[type].count}</div>
                    </div>
                `;
  });
  document.getElementById("categoryBreakdown").innerHTML = categoryHTML;

  // Waterfall visualization
  let waterfallHTML = "";
  flows.forEach((flow, index) => {
    const bucketType = BUCKET_TYPES[flow.type] || BUCKET_TYPES.other;
    const isDebt = flow.desired === 0 && flow.current < 0;
    let progress = 0;
    let barClass = "incomplete";

    if (isDebt) {
      progress = 100;
      barClass = "debt";
    } else if (flow.desired !== 0) {
      progress = Math.min(
        Math.max((flow.current / flow.desired) * 100, 0),
        100
      );
      if (flow.isComplete) barClass = "";
    }

    waterfallHTML += `
                    <div class="waterfall-bucket">
                        <div class="waterfall-header">
                            <div class="waterfall-name">
                                <span>${bucketType.emoji}</span>
                                <span>${flow.name || "Unnamed Bucket"}</span>
                            </div>
                            <div class="waterfall-amount">${flow.current.toLocaleString()}</div>
                        </div>
                        ${
                          flow.description
                            ? `<div style="font-size: 0.85rem; color: #666; margin-bottom: 8px;">${flow.description}</div>`
                            : ""
                        }
                        <div class="waterfall-bar-container">
                            <div class="waterfall-bar ${barClass}" style="width: ${progress}%">
                                ${
                                  progress > 20
                                    ? flow.isComplete
                                      ? "✓ Complete"
                                      : progress.toFixed(0) + "%"
                                    : ""
                                }
                            </div>
                        </div>
                        ${
                          flow.amountToMove > 0
                            ? `<div style="margin-top: 8px; color: #48bb78; font-weight: 600; font-size: 0.9rem;">💧 +${flow.amountToMove.toLocaleString()}</div>`
                            : ""
                        }
                    </div>
                    ${
                      index < flows.length - 1
                        ? '<div class="waterfall-flow-arrow">⬇</div>'
                        : ""
                    }
                `;
  });
  document.getElementById("waterfallViz").innerHTML = waterfallHTML;
}

function calculateFlow() {
  let remaining = 0;
  const flows = [];

  buckets.forEach((bucket, index) => {
    const gap = bucket.desired - bucket.current;
    const amountToMove = Math.min(Math.max(gap, 0), remaining);

    flows.push({
      ...bucket,
      gap,
      amountToMove,
      overflow: remaining - amountToMove,
      isComplete: bucket.current >= bucket.desired,
    });

    if (index === 0) {
      remaining = Math.max(0, bucket.current - bucket.desired);
    } else {
      remaining = remaining - amountToMove;
    }
  });

  return flows;
}

function handleDragStart(e, index) {
  draggedIndex = index;
  e.target.classList.add("dragging");
}

function handleDragEnd(e) {
  e.target.classList.remove("dragging");
  draggedIndex = null;
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDrop(e, dropIndex) {
  e.preventDefault();
  if (draggedIndex === null || draggedIndex === dropIndex) return;

  const draggedBucket = buckets[draggedIndex];
  buckets.splice(draggedIndex, 1);
  buckets.splice(dropIndex, 0, draggedBucket);

  saveData();
  render();
}

// Wizard Functions
function showWizard() {
  wizardData = {
    currentStep: 0,
    monthlyExpenses: 0,
    hasDebts: false,
    hasRetirement: false,
    goals: [],
  };
  document.getElementById("wizardOverlay").style.display = "flex";
  updateWizardUI();
}

function hideWizard() {
  document.getElementById("wizardOverlay").style.display = "none";
}

function nextWizardStep() {
  if (wizardData.currentStep === 1) {
    const expenses = parseFloat(
      document.getElementById("monthlyExpenses").value
    );
    if (!expenses || expenses <= 0) {
      alert("Please enter your monthly expenses");
      return;
    }
    wizardData.monthlyExpenses = expenses;
  }

  wizardData.currentStep++;
  updateWizardUI();
}

function prevWizardStep() {
  wizardData.currentStep--;
  updateWizardUI();
}

function selectWizardOption(step, option) {
  document
    .querySelectorAll(`[data-step="${step}"] .wizard-option`)
    .forEach((opt) => {
      opt.classList.remove("selected");
    });
  event.target.closest(".wizard-option").classList.add("selected");

  if (step === 2) {
    wizardData.hasDebts = option === "has-debts";
  } else if (step === 3) {
    wizardData.hasRetirement = option === "has-match";
  }
}

function toggleWizardGoal(goal) {
  const option = event.target.closest(".wizard-option");
  option.classList.toggle("selected");

  const index = wizardData.goals.indexOf(goal);
  if (index > -1) {
    wizardData.goals.splice(index, 1);
  } else {
    wizardData.goals.push(goal);
  }
}

function updateWizardUI() {
  // Update progress dots
  document.querySelectorAll(".wizard-progress-dot").forEach((dot, index) => {
    if (index <= wizardData.currentStep) {
      dot.classList.add("active");
    } else {
      dot.classList.remove("active");
    }
  });

  // Update steps
  document.querySelectorAll(".wizard-step").forEach((step, index) => {
    if (index === wizardData.currentStep) {
      step.classList.add("active");
    } else {
      step.classList.remove("active");
    }
  });

  // Update buttons
  const prevBtn = document.getElementById("wizardPrevBtn");
  const nextBtn = document.getElementById("wizardNextBtn");
  const finishBtn = document.getElementById("wizardFinishBtn");

  prevBtn.style.display = wizardData.currentStep > 0 ? "inline-block" : "none";
  nextBtn.style.display = wizardData.currentStep < 4 ? "inline-block" : "none";
  finishBtn.style.display =
    wizardData.currentStep === 4 ? "inline-block" : "none";
}

function finishWizard() {
  const newBuckets = [];
  const expenses = wizardData.monthlyExpenses;

  // 1. Checking Buffer (2 months expenses)
  newBuckets.push({
    name: "Checking Buffer",
    current: 0,
    desired: expenses * 2,
    description: `2 months of expenses (${expenses.toLocaleString()}/mo)`,
    type: "checking",
  });

  // 2. Emergency Fund (start with 1 month)
  newBuckets.push({
    name: "Emergency Fund",
    current: 0,
    desired: expenses,
    description: "Start with 1 month, increase to 3-6 months after debts",
    type: "emergency",
  });

  // 3. High interest debts placeholder (if they have debts)
  if (wizardData.hasDebts) {
    newBuckets.push({
      name: "High Interest Debt",
      current: 0,
      desired: 0,
      description: "Add your debts over 10% interest (credit cards, etc.)",
      type: "debt",
    });
  }

  // 4. Retirement account (if they have employer match)
  if (wizardData.hasRetirement) {
    newBuckets.push({
      name: "Employer Retirement (Match)",
      current: 0,
      desired: 0,
      description: "Contribute enough to get full employer match",
      type: "retirement",
    });
  }

  // 5. Moderate/Low interest debts placeholder (if they have debts)
  if (wizardData.hasDebts) {
    newBuckets.push({
      name: "Moderate Interest Debt",
      current: 0,
      desired: 0,
      description: "Debts with 4-10% interest (student loans, car loans)",
      type: "debt",
    });
  }

  // 6. IRA
  newBuckets.push({
    name: "Roth IRA",
    current: 0,
    desired: 7000,
    description: "2024 contribution limit",
    type: "retirement",
  });

  // 7. Add selected goals
  wizardData.goals.forEach((goal) => {
    const goalConfigs = {
      house: {
        name: "House Down Payment",
        desired: 50000,
        description: "20% down payment fund",
      },
      vacation: {
        name: "Vacation Fund",
        desired: 3000,
        description: "Annual travel savings",
      },
      car: {
        name: "Vehicle Purchase",
        desired: 10000,
        description: "Next car fund",
      },
      education: {
        name: "Education Fund",
        desired: 5000,
        description: "Courses, certifications, etc.",
      },
    };

    const config = goalConfigs[goal];
    if (config) {
      newBuckets.push({
        name: config.name,
        current: 0,
        desired: config.desired,
        description: config.description,
        type: goal,
      });
    }
  });

  // 8. General investment
  newBuckets.push({
    name: "General Investment",
    current: 0,
    desired: 100000,
    description: "Long-term wealth building",
    type: "investment",
  });

  buckets = newBuckets;
  saveData();
  render();
  hideWizard();
}

function render() {
  const container = document.getElementById("bucketsContainer");
  const emptyState = document.getElementById("emptyState");
  const summary = document.getElementById("summary");
  const clearBtn = document.getElementById("clearBtn");

  if (buckets.length === 0) {
    container.innerHTML = "";
    emptyState.style.display = "block";
    summary.style.display = "none";
    clearBtn.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  summary.style.display = "block";
  clearBtn.style.display = "inline-block";

  const flows = calculateFlow();
  let html = "";

  flows.forEach((flow, index) => {
    const bucketType = BUCKET_TYPES[flow.type] || BUCKET_TYPES.other;
    const isDebt = flow.desired === 0 && flow.current < 0;

    let progress = 0;
    if (isDebt) {
      // For debt: show how much has been paid off
      progress = 100; // Full red bar for unpaid debt
    } else if (flow.desired !== 0) {
      progress = Math.min(
        Math.max((flow.current / flow.desired) * 100, 0),
        100
      );
    }

    html += `
                    <div class="bucket" 
                         draggable="true" 
                         ondragstart="handleDragStart(event, ${index})"
                         ondragend="handleDragEnd(event)"
                         ondragover="handleDragOver(event)"
                         ondrop="handleDrop(event, ${index})">
                        <div class="bucket-header">
                            <span class="drag-handle">⋮⋮</span>
                            <div class="bucket-number" onclick="event.stopPropagation(); toggleBucketTypeSelector(${index})">
                                ${bucketType.emoji}
                                <div class="bucket-type-selector" id="type-selector-${index}">
                                    ${Object.keys(BUCKET_TYPES)
                                      .map((typeKey) => {
                                        const type = BUCKET_TYPES[typeKey];
                                        return `
                                            <div class="bucket-type-option ${
                                              flow.type === typeKey
                                                ? "selected"
                                                : ""
                                            }" 
                                                 onclick="event.stopPropagation(); selectBucketType(${index}, '${typeKey}')">
                                                <span>${type.emoji}</span>
                                                <span>${type.name}</span>
                                            </div>
                                        `;
                                      })
                                      .join("")}
                                </div>
                            </div>
                            <div style="flex: 1;">
                                <div class="bucket-inputs">
                                    <div class="input-group">
                                        <input type="text" 
                                               placeholder="Bucket name" 
                                               value="${flow.name}" 
                                               onchange="updateBucket(${index}, 'name', this.value)">
                                    </div>
                                    <div class="input-group input-with-tooltip">
                                        <input type="number" 
                                               placeholder="Current" 
                                               value="${flow.current || ""}" 
                                               onchange="updateBucket(${index}, 'current', this.value)">
                                        <div class="tooltip-icon">?
                                            <div class="tooltip">Your current balance${
                                              isDebt
                                                ? " (negative for debt)"
                                                : ""
                                            }</div>
                                        </div>
                                    </div>
                                    <div class="input-group input-with-tooltip">
                                        <input type="number" 
                                               placeholder="Goal" 
                                               value="${
                                                 flow.desired === 0
                                                   ? 0
                                                   : flow.desired || ""
                                               }" 
                                               onchange="updateBucket(${index}, 'desired', this.value)">
                                        <div class="tooltip-icon">?
                                            <div class="tooltip">Target amount${
                                              isDebt
                                                ? " ($0 for debt payoff)"
                                                : ""
                                            }</div>
                                        </div>
                                    </div>
                                    <div class="input-group description-field">
                                        <textarea placeholder="Description (optional)" 
                                                  onchange="updateBucket(${index}, 'description', this.value)">${
      flow.description || ""
    }</textarea>
                                    </div>
                                </div>
                            </div>
                            <button class="delete-btn" onclick="removeBucket(${index})">🗑️</button>
                        </div>
                        
                        ${
                          isDebt || flow.desired !== 0
                            ? `
                            <div class="progress-section">
                                <div class="progress-labels">
                                    <span>${flow.current.toLocaleString()}</span>
                                    <span>${flow.desired.toLocaleString()}</span>
                                </div>
                                <div class="progress-bar">
                                    ${
                                      isDebt
                                        ? `
                                        <div class="progress-fill debt" style="width: 100%"></div>
                                    `
                                        : `
                                        <div class="progress-fill ${
                                          flow.isComplete ? "" : ""
                                        }" 
                                             style="width: ${progress}%"></div>
                                    `
                                    }
                                </div>
                            </div>
                        `
                            : ""
                        }
                        
                        ${
                          flow.amountToMove > 0
                            ? `
                            <div class="action-badge">
                                Move ${flow.amountToMove.toLocaleString()} to ${
                                flow.name || "this bucket"
                              }
                            </div>
                        `
                            : ""
                        }
                    </div>
                    ${
                      index < flows.length - 1
                        ? '<div class="flow-arrow">↓</div>'
                        : ""
                    }
                `;
  });

  container.innerHTML = html;

  // Update summary
  const totalOverflow =
    buckets.length > 0
      ? Math.max(0, buckets[0].current - buckets[0].desired)
      : 0;
  const completeCount = flows.filter((f) => f.isComplete).length;
  const totalAllocated = flows.reduce((sum, f) => sum + f.amountToMove, 0);

  document.getElementById("overflowAmount").textContent =
    totalOverflow.toLocaleString();
  document.getElementById(
    "completeCount"
  ).textContent = `${completeCount} / ${flows.length}`;
  document.getElementById("allocatedAmount").textContent =
    totalAllocated.toLocaleString();
}

// Initialize
loadData();
render();

// Show wizard on first visit
if (buckets.length === 0 && !localStorage.getItem("wizardShown")) {
  setTimeout(() => {
    showWizard();
    localStorage.setItem("wizardShown", "true");
  }, 500);
}
