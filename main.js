const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {

    function convertToSeconds(timeStr) {
        timeStr = timeStr.trim();
        let [time, period] = timeStr.split(" ");
        let [h, m, s] = time.split(":").map(Number);

        if (period === "pm" && h !== 12) h += 12;
        if (period === "am" && h === 12) h = 0;

        return h * 3600 + m * 60 + s;
    }

    let start = convertToSeconds(startTime);
    let end = convertToSeconds(endTime);

    let diff = end - start;

    let h = Math.floor(diff / 3600);
    diff %= 3600;
    let m = Math.floor(diff / 60);
    let s = diff % 60;

    return h + ":" + String(m).padStart(2,'0') + ":" + String(s).padStart(2,'0');
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {

    function convertToSeconds(timeStr) {
        timeStr = timeStr.trim();
        let [time, period] = timeStr.split(" ");
        let [h, m, s] = time.split(":").map(Number);

        if (period === "pm" && h !== 12) h += 12;
        if (period === "am" && h === 12) h = 0;

        return h * 3600 + m * 60 + s;
    }

    let start = convertToSeconds(startTime);
    let end = convertToSeconds(endTime);

    let deliveryStart = 8 * 3600;   // 8:00 AM
    let deliveryEnd = 22 * 3600;    // 10:00 PM

    let idle = 0;

    if (start < deliveryStart) {
        idle += Math.min(end, deliveryStart) - start;
    }

    if (end > deliveryEnd) {
        idle += end - Math.max(start, deliveryEnd);
    }

    let h = Math.floor(idle / 3600);
    idle %= 3600;
    let m = Math.floor(idle / 60);
    let s = idle % 60;

    return h + ":" + String(m).padStart(2,'0') + ":" + String(s).padStart(2,'0');
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {

    function toSeconds(timeStr) {
        let [h, m, s] = timeStr.split(":").map(Number);
        return h * 3600 + m * 60 + s;
    }

    let shift = toSeconds(shiftDuration);
    let idle = toSeconds(idleTime);

    let active = shift - idle;

    let h = Math.floor(active / 3600);
    active %= 3600;
    let m = Math.floor(active / 60);
    let s = active % 60;

    return h + ":" + String(m).padStart(2,'0') + ":" + String(s).padStart(2,'0');
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {

    function toSeconds(timeStr) {
        let [h, m, s] = timeStr.split(":").map(Number);
        return h * 3600 + m * 60 + s;
    }

    let active = toSeconds(activeTime);

    let normalQuota = (8 * 3600) + (24 * 60); // 8:24:00
    let eidQuota = 6 * 3600; // 6:00:00

    let day = new Date(date);
    let eidStart = new Date("2025-04-10");
    let eidEnd = new Date("2025-04-30");

    let quota = normalQuota;

    if (day >= eidStart && day <= eidEnd) {
        quota = eidQuota;
    }

    return active >= quota;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================


function addShiftRecord(textFile, shiftObj) {

    let data = fs.readFileSync(textFile, "utf8").trim();
    let lines = data.length ? data.split("\n") : [];

    for (let line of lines) {
        let parts = line.split(",");
        if (parts[0] === shiftObj.driverID && parts[2] === shiftObj.date) {
            return {};
        }
    }

    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let quotaMet = metQuota(shiftObj.date, activeTime);

    let newRecord = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: quotaMet,
        hasBonus: false
    };

    let newLine = [
        newRecord.driverID,
        newRecord.driverName,
        newRecord.date,
        newRecord.startTime,
        newRecord.endTime,
        newRecord.shiftDuration,
        newRecord.idleTime,
        newRecord.activeTime,
        newRecord.metQuota,
        newRecord.hasBonus
    ].join(",");

    lines.push(newLine);

    fs.writeFileSync(textFile, lines.join("\n"));

    return newRecord;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {

    const fs = require("fs");

    let data = fs.readFileSync(textFile, "utf8").trim();
    let lines = data.split("\n");

    for (let i = 0; i < lines.length; i++) {

        let parts = lines[i].split(",");

        if (parts[0] === driverID && parts[2] === date) {
            parts[9] = newValue.toString();
            lines[i] = parts.join(",");
        }

    }

    fs.writeFileSync(textFile, lines.join("\n"));
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {

    const fs = require("fs");

    let data = fs.readFileSync(textFile, "utf8").trim();
    let lines = data.split("\n");

    let count = 0;
    let foundDriver = false;

    for (let line of lines) {

        let parts = line.split(",");

        let id = parts[0];
        let date = parts[2];
        let bonus = parts[9];

        if (id === driverID) {
            foundDriver = true;

            let recordMonth = parseInt(date.split("-")[1]);

            if (recordMonth === parseInt(month) && bonus === "true") {
                count++;
            }
        }
    }

    if (!foundDriver) {
        return -1;
    }

    return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {

    const fs = require("fs");

    let data = fs.readFileSync(textFile, "utf8").trim();
    let lines = data.split("\n");

    let totalSeconds = 0;

    function toSeconds(timeStr) {
        let [h, m, s] = timeStr.split(":").map(Number);
        return h * 3600 + m * 60 + s;
    }

    for (let line of lines) {

        let parts = line.split(",");

        let id = parts[0];
        let date = parts[2];
        let activeTime = parts[7];

        if (id === driverID) {

            let recordMonth = parseInt(date.split("-")[1]);

            if (recordMonth === parseInt(month)) {
                totalSeconds += toSeconds(activeTime);
            }

        }
    }

    let h = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    let m = Math.floor(totalSeconds / 60);
    let s = totalSeconds % 60;

    return h + ":" + String(m).padStart(2,'0') + ":" + String(s).padStart(2,'0');
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {

    const fs = require("fs");

    let shiftData = fs.readFileSync(textFile, "utf8").trim().split("\n");
    let rateData = fs.readFileSync(rateFile, "utf8").trim().split("\n");

    let dayOff = "";

    for (let line of rateData) {
        let parts = line.split(",");
        if (parts[0] === driverID) {
            dayOff = parts[1];
        }
    }

    let totalSeconds = 0;

    let normalQuota = (8 * 3600) + (24 * 60);
    let eidQuota = 6 * 3600;

    for (let line of shiftData) {

        let parts = line.split(",");

        let id = parts[0];
        let dateStr = parts[2];

        if (id !== driverID) continue;

        let date = new Date(dateStr);
        let recordMonth = date.getMonth() + 1;

        if (recordMonth !== parseInt(month)) continue;

        let weekday = date.toLocaleDateString("en-US", { weekday: "long" });

        if (weekday === dayOff) continue;

        let quota = normalQuota;

        let eidStart = new Date("2025-04-10");
        let eidEnd = new Date("2025-04-30");

        if (date >= eidStart && date <= eidEnd) {
            quota = eidQuota;
        }

        totalSeconds += quota;
    }

    totalSeconds -= bonusCount * (2 * 3600);

    if (totalSeconds < 0) totalSeconds = 0;

    let h = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    let m = Math.floor(totalSeconds / 60);
    let s = totalSeconds % 60;

    return h + ":" + String(m).padStart(2,'0') + ":" + String(s).padStart(2,'0');
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {

    const fs = require("fs");

    let data = fs.readFileSync(rateFile, "utf8").trim().split("\n");

    let basePay = 0;
    let tier = 0;

    for (let line of data) {
        let parts = line.split(",");

        if (parts[0] === driverID) {
            basePay = parseInt(parts[2]);
            tier = parseInt(parts[3]);
        }
    }

    function toSeconds(timeStr) {
        let [h,m,s] = timeStr.split(":").map(Number);
        return h*3600 + m*60 + s;
    }

    let actual = toSeconds(actualHours);
    let required = toSeconds(requiredHours);

    if (actual >= required) {
        return basePay;
    }

    let missing = required - actual;

    let allowed = 0;

    if (tier === 1) allowed = 50;
    if (tier === 2) allowed = 20;
    if (tier === 3) allowed = 10;
    if (tier === 4) allowed = 3;

    let missingHours = Math.floor(missing / 3600);

    missingHours -= allowed;

    if (missingHours < 0) missingHours = 0;

    let deductionRate = Math.floor(basePay / 185);

    let salaryDeduction = missingHours * deductionRate;

    return basePay - salaryDeduction;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
