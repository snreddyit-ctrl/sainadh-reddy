/**
 * Google Apps Script Web App code ready to paste into Extensions > Apps Script in Google Sheets
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * VIJAYA AGENCIES - Google Sheets Backend API
 * 
 * SETUP INSTRUCTIONS:
 * 1. In your Google Sheet, click Extensions > Apps Script
 * 2. Delete any existing code in Code.gs and paste this entire code
 * 3. Run the "setupSheetStructure" function once to create required columns & sheets
 * 4. Click Deploy > New deployment
 * 5. Select type: "Web app"
 * 6. Configuration:
 *    - Description: VIJAYA AGENCIES API
 *    - Execute as: "Me" (your email)
 *    - Who has access: "Anyone" (allows app to connect)
 * 7. Click Deploy, Authorize access, and copy the Web App URL!
 * 8. Paste the Web App URL into the app's Google Sheets connection settings.
 */

const MAIN_SHEET_NAME = "Main";
const ROOTS_SHEET_NAME = "Roots";

// Initialize sheets and header structure
function setupSheetStructure() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Setup Main Sheet
  let mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  if (!mainSheet) {
    mainSheet = ss.insertSheet(MAIN_SHEET_NAME);
  }
  
  const mainHeaders = [
    "Bill No",
    "Root",
    "Bill Date",
    "Bill Amount",
    "Amount Paid",
    "Amount Pending",
    "Status"
  ];
  
  if (mainSheet.getLastRow() === 0) {
    mainSheet.appendRow(mainHeaders);
    mainSheet.getRange(1, 1, 1, mainHeaders.length).setFontWeight("bold").setBackground("#e2e8f0");
    mainSheet.setFrozenRows(1);
    
    // Add sample initial invoice
    // Initial blank sheet ready for user's real data
  }

  // 2. Setup Roots Sheet
  let rootsSheet = ss.getSheetByName(ROOTS_SHEET_NAME);
  if (!rootsSheet) {
    rootsSheet = ss.insertSheet(ROOTS_SHEET_NAME);
  }
  
  if (rootsSheet.getLastRow() === 0) {
    rootsSheet.appendRow(["Root"]);
    rootsSheet.getRange(1, 1, 1, 1).setFontWeight("bold").setBackground("#e2e8f0");
    rootsSheet.setFrozenRows(1);
  }

  return "Setup completed successfully!";
}

// GET Requests
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "getInvoices";
  
  try {
    if (action === "getInvoices") {
      const invoices = fetchInvoices();
      return jsonResponse({ success: true, data: invoices });
    }
    
    if (action === "getRoots") {
      const roots = fetchRoots();
      return jsonResponse({ success: true, data: roots });
    }
    
    if (action === "test") {
      return jsonResponse({ success: true, message: "VIJAYA AGENCIES API connected successfully!" });
    }

    return jsonResponse({ success: false, message: "Unknown action: " + action });
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }
}

// POST Requests
function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    
    const action = body.action;

    if (action === "addInvoice") {
      return addInvoice(body.data);
    }
    
    if (action === "addPayment") {
      return addPayment(body.billNo, Number(body.currentPayment));
    }
    
    if (action === "updateInvoice") {
      return updateInvoice(body.data);
    }
    
    if (action === "deleteInvoice") {
      return deleteInvoice(body.billNo);
    }
    
    if (action === "addRoot") {
      return addRoot(body.rootName);
    }

    if (action === "updateRoot") {
      return updateRoot(body.oldRootName, body.newRootName);
    }

    if (action === "deleteRoot") {
      return deleteRoot(body.rootName);
    }

    return jsonResponse({ success: false, message: "Invalid action" });
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }
}

function fetchInvoices() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(MAIN_SHEET_NAME);
  if (!sheet) {
    setupSheetStructure();
    sheet = ss.getSheetByName(MAIN_SHEET_NAME);
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  const invoices = [];

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const billNo = String(row[0]).trim();
    if (!billNo) continue;
    
    const billAmount = Number(row[3]) || 0;
    const amountPaid = Number(row[4]) || 0;
    const amountPending = Number(row[5]) >= 0 ? Number(row[5]) : Math.max(0, billAmount - amountPaid);
    const status = String(row[6]).trim() || (amountPaid >= billAmount ? "Paid" : amountPaid > 0 ? "Part Paid" : "Pending");

    let billDate = row[2];
    if (billDate instanceof Date) {
      const y = billDate.getFullYear();
      const m = String(billDate.getMonth() + 1).padStart(2, '0');
      const d = String(billDate.getDate()).padStart(2, '0');
      billDate = y + '-' + m + '-' + d;
    } else {
      billDate = String(billDate);
    }

    invoices.push({
      billNo: billNo,
      root: String(row[1] || ""),
      billDate: billDate,
      billAmount: billAmount,
      amountPaid: amountPaid,
      amountPending: amountPending,
      status: status
    });
  }

  return invoices;
}

function fetchRoots() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ROOTS_SHEET_NAME);
  const roots = [];

  if (sheet) {
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < values.length; i++) {
        const rootName = String(values[i][0]).trim();
        if (rootName && roots.indexOf(rootName) === -1) {
          roots.push(rootName);
        }
      }
    }
  }

  // If Roots tab is empty or has no entries, extract all unique roots directly from the Main sheet invoices
  if (roots.length === 0) {
    const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);
    if (mainSheet) {
      const mainLastRow = mainSheet.getLastRow();
      if (mainLastRow > 1) {
        const mainValues = mainSheet.getRange(2, 2, mainLastRow - 1, 1).getValues();
        for (let j = 0; j < mainValues.length; j++) {
          const rootVal = String(mainValues[j][0]).trim();
          if (rootVal && roots.indexOf(rootVal) === -1) {
            roots.push(rootVal);
          }
        }
      }
    }
  }

  return roots;
}

function addInvoice(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MAIN_SHEET_NAME);
  
  const billNo = String(data.billNo).trim();
  if (!billNo) {
    return jsonResponse({ success: false, message: "Bill No is required" });
  }

  const billAmount = Number(data.billAmount) || 0;
  const amountPaid = Number(data.amountPaid) || 0;
  const amountPending = Math.max(0, billAmount - amountPaid);
  
  let status = "Pending";
  if (amountPaid >= billAmount) {
    status = "Paid";
  } else if (amountPaid > 0) {
    status = "Part Paid";
  }

  sheet.appendRow([
    billNo,
    data.root || "",
    data.billDate || "",
    billAmount,
    amountPaid,
    amountPending,
    status
  ]);

  return jsonResponse({
    success: true,
    message: "Invoice saved successfully.",
    data: {
      billNo: billNo,
      root: data.root,
      billDate: data.billDate,
      billAmount: billAmount,
      amountPaid: amountPaid,
      amountPending: amountPending,
      status: status
    }
  });
}

function addPayment(billNo, currentPayment) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MAIN_SHEET_NAME);
  const targetBillNo = String(billNo).trim();

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return jsonResponse({ success: false, message: "No invoices found." });
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  let foundRowIndex = -1;
  let currentRow = null;

  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === targetBillNo) {
      foundRowIndex = i + 2; // 1-based index including header
      currentRow = values[i];
      break;
    }
  }

  if (foundRowIndex === -1) {
    return jsonResponse({ success: false, message: "Bill No not found: " + targetBillNo });
  }

  const billAmount = Number(currentRow[3]) || 0;
  const previousAmountPaid = Number(currentRow[4]) || 0;
  const newAmountPaid = previousAmountPaid + Number(currentPayment);
  const newAmountPending = Math.max(0, billAmount - newAmountPaid);
  
  let newStatus = "Pending";
  if (newAmountPaid >= billAmount) {
    newStatus = "Paid";
  } else if (newAmountPaid > 0) {
    newStatus = "Part Paid";
  }

  // Update sheet row columns: Amount Paid (col 5), Amount Pending (col 6), Status (col 7)
  sheet.getRange(foundRowIndex, 5).setValue(newAmountPaid);
  sheet.getRange(foundRowIndex, 6).setValue(newAmountPending);
  sheet.getRange(foundRowIndex, 7).setValue(newStatus);

  return jsonResponse({
    success: true,
    message: "Payment recorded successfully.",
    data: {
      billNo: targetBillNo,
      previousAmountPaid: previousAmountPaid,
      currentPayment: currentPayment,
      newAmountPaid: newAmountPaid,
      amountPending: newAmountPending,
      status: newStatus
    }
  });
}

function updateInvoice(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MAIN_SHEET_NAME);
  const targetBillNo = String(data.billNo).trim();

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return jsonResponse({ success: false, message: "No invoices found." });
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  let foundRowIndex = -1;

  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === targetBillNo) {
      foundRowIndex = i + 2;
      break;
    }
  }

  if (foundRowIndex === -1) {
    return jsonResponse({ success: false, message: "Invoice not found." });
  }

  const billAmount = Number(data.billAmount) || 0;
  const amountPaid = Number(data.amountPaid) || 0;
  const amountPending = Math.max(0, billAmount - amountPaid);
  
  let status = "Pending";
  if (amountPaid >= billAmount) {
    status = "Paid";
  } else if (amountPaid > 0) {
    status = "Part Paid";
  }

  sheet.getRange(foundRowIndex, 2).setValue(data.root || "");
  sheet.getRange(foundRowIndex, 3).setValue(data.billDate || "");
  sheet.getRange(foundRowIndex, 4).setValue(billAmount);
  sheet.getRange(foundRowIndex, 5).setValue(amountPaid);
  sheet.getRange(foundRowIndex, 6).setValue(amountPending);
  sheet.getRange(foundRowIndex, 7).setValue(status);

  return jsonResponse({ success: true, message: "Invoice updated successfully." });
}

function deleteInvoice(billNo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MAIN_SHEET_NAME);
  const targetBillNo = String(billNo).trim();

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return jsonResponse({ success: false, message: "No invoices found." });
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === targetBillNo) {
      sheet.deleteRow(i + 2);
      return jsonResponse({ success: true, message: "Invoice deleted successfully." });
    }
  }

  return jsonResponse({ success: false, message: "Invoice not found." });
}

function addRoot(rootName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ROOTS_SHEET_NAME);
  if (!sheet) {
    setupSheetStructure();
    sheet = ss.getSheetByName(ROOTS_SHEET_NAME);
  }

  const cleanName = String(rootName).trim();
  if (!cleanName) {
    return jsonResponse({ success: false, message: "Root name cannot be empty" });
  }

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const existing = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < existing.length; i++) {
      if (String(existing[i][0]).trim().toLowerCase() === cleanName.toLowerCase()) {
        return jsonResponse({ success: false, message: "Root already exists" });
      }
    }
  }

  sheet.appendRow([cleanName]);
  return jsonResponse({ success: true, message: "Root added successfully", root: cleanName });
}

function updateRoot(oldRootName, newRootName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let rootsSheet = ss.getSheetByName(ROOTS_SHEET_NAME);
  let mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  
  const cleanOld = String(oldRootName).trim();
  const cleanNew = String(newRootName).trim();
  
  if (!cleanNew) {
    return jsonResponse({ success: false, message: "New root name cannot be empty" });
  }

  // Update in Roots sheet
  if (rootsSheet) {
    const lastRow = rootsSheet.getLastRow();
    if (lastRow > 1) {
      const values = rootsSheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < values.length; i++) {
        if (String(values[i][0]).trim().toLowerCase() === cleanOld.toLowerCase()) {
          rootsSheet.getRange(i + 2, 1).setValue(cleanNew);
          break;
        }
      }
    }
  }

  // Update in Main invoices sheet
  let updatedCount = 0;
  if (mainSheet) {
    const mainLastRow = mainSheet.getLastRow();
    if (mainLastRow > 1) {
      const rootColValues = mainSheet.getRange(2, 2, mainLastRow - 1, 1).getValues();
      for (let i = 0; i < rootColValues.length; i++) {
        if (String(rootColValues[i][0]).trim().toLowerCase() === cleanOld.toLowerCase()) {
          mainSheet.getRange(i + 2, 2).setValue(cleanNew);
          updatedCount++;
        }
      }
    }
  }

  return jsonResponse({
    success: true,
    message: "Root updated successfully. " + updatedCount + " invoices updated.",
    root: cleanNew
  });
}

function deleteRoot(rootName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ROOTS_SHEET_NAME);
  if (!sheet) {
    return jsonResponse({ success: false, message: "Roots sheet not found" });
  }

  const cleanName = String(rootName).trim();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return jsonResponse({ success: false, message: "No roots found" });
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === cleanName.toLowerCase()) {
      sheet.deleteRow(i + 2);
      return jsonResponse({ success: true, message: "Root deleted successfully", root: cleanName });
    }
  }

  return jsonResponse({ success: false, message: "Root not found in sheet" });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
