document.addEventListener("DOMContentLoaded", () => {
    const monthPicker = document.getElementById("monthPicker");
    const plantPicker = document.getElementById("plantPicker");
  
    monthPicker.valueAsDate = new Date();
    fetchFreightData(monthPicker.value, plantPicker.value);
  
    monthPicker.addEventListener("change", () => fetchFreightData(monthPicker.value, plantPicker.value));
    plantPicker.addEventListener("change", () => fetchFreightData(monthPicker.value, plantPicker.value));
  });
  
  const fetchFreightData = (selectedMonth, selectedPlant) => {
    const tableContainer = document.getElementById("tableContainer");
    tableContainer.innerHTML = "";
  
    const [year, month] = selectedMonth.split("-").map(Number);
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const invoiceDate = `${selectedMonth}-${lastDayOfMonth}`;
  
    const apiUrl = `https://pel.quadworld.in/air-freight-cost/aggregate/safety-sheet?clientId=AACCS3034M&invoiceDate=${invoiceDate}&type=daily&plant=${selectedPlant}`;
    const token = localStorage.getItem("token");
  
    if (!token) {
      console.error("No token found");
      return;
    }
  
    fetch(apiUrl, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => {
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
        return response.json();
      })
      .then(data => createTables(data, tableContainer))
      .catch(error => console.error("Error fetching data:", error));
  };
  
  const createTables = (data, container) => {
    const tables = { "Victora Account": [],  "Customer Account": [] };
  
    data.forEach(item => {
        item.freightLogs.forEach(log => {
          log.freightLogs.forEach(innerLog => {
            innerLog.freightLogs.forEach(deepestLog => {
              const category = deepestLog.freightBorneBy;
              if (tables[category]) {
                // Get an array of rows for each deepestLog and add them to the table
                tables[category].push(...createTableRow(deepestLog, log));
              }
            });
          });
        });
      });
  
    Object.keys(tables).forEach(category => {
      let categoryName = category;
      if (category === "Victora Account") {
        categoryName = "Detail Report- Freight Account-Plant";
      } else if (category === "Customer Account") {
        categoryName = "Detail Report- Freight Account-Customer Account";
      }
      let tableHTML = `
        <div class="mb-5 table-wrapper">
          <h3 class="Thead">${categoryName}</h3>
          <table class="table table-striped table-bordered table-hover mt-3">
            <thead>
              <tr>
                <th class="headtab">Material Group</th>
                <th class="headtab">Material</th>
                <th class="headtab">Reason for Air</th>
                <th class="headtab">Air Freight Amount</th>
              </tr>
            </thead>
            <tbody>
              ${tables[category].map(row => `
                <tr>
                  <td>${row.materialGroup}</td>
                  <td>${row.material}</td>
                  <td>${row.reasonForAir}</td>
                  <td>${row.airFreightAmount}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total-amount">
            <strong>Total Air Freight Amount: </strong>
            <span class="amount-value">${tables[category].reduce((sum, row) => sum + row.airFreightAmount, 0)}</span>
          </div>
        </div>`;
      container.insertAdjacentHTML("beforeend", tableHTML);
    });
  };
  
  const findReasonForAir = (freightLog, materialGroup) => {
    if (freightLog.materialGroup === materialGroup && freightLog.reasonForAir) {
      return freightLog.reasonForAir;
    }
    return freightLog.freightLogs
      ? freightLog.freightLogs.map(innerLog => findReasonForAir(innerLog, materialGroup)).find(reason => reason)
      : "-";
  };
  
  const findMaterialWithAirFreight = (log) => {
    if (log.machineLogs && log.machineLogs.length > 0) {
      const validMaterials = log.machineLogs
        .filter(machineLog => machineLog.airFreightAmount > 0)
        .map(machineLog => machineLog.material);
  
      return validMaterials.length > 0 ? validMaterials.join(', ') : "-";
    }
    return "-";
  };
  
  const findMaterial = (freightLog) => {
    if (freightLog.machineLogs) {
      return findMaterialWithAirFreight(freightLog);
    }
    return freightLog.freightLogs?.length > 0
      ? freightLog.freightLogs.map(innerLog => findMaterial(innerLog)).find(material => material !== "-")
      : "-";
  };
  
  const createTableRow = (log, parentLog) => {
    if (log.machineLogs && log.machineLogs.length > 0) {
      return log.machineLogs
        .filter(machineLog => machineLog.airFreightAmount > 0)
        .map(machineLog => ({
          materialGroup: log.materialGroup,
          airFreightAmount: machineLog.airFreightAmount,
          reasonForAir: findReasonForAir(parentLog, log.materialGroup),
          material: machineLog.material
        }));
    }
    return [];
  };
  