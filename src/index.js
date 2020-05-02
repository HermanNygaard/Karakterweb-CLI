#!/usr/bin/env node
const inquirer = require("inquirer");
const fetch = require("node-fetch");
const wunderbar = require("@gribnoysup/wunderbar");
const nconf = require("nconf");

nconf.use("file", { file: "config.json" });
let uni = nconf.get("uni") || 1110;
nconf.load();

const uniMap = {
  uio: 1110,
  ntnu: 1150,
  uib: 1120,
};

// Handle flags
if (process.argv[2]) {
  const arr = process.argv[2].split("=");
  if (arr[0] !== "--set-uni") {
    console.log("Error. Only flag --set-uni is supported.");
    console.log("karakter --set-uni=ntnu to set ntnu as the default");
  } else {
    const name = arr[1];
    const code = uniMap[`${name}`];
    if (code) {
      console.log(`${name} is now set as the default university.`);
      nconf.set("uni", code);
      uni = code;
      nconf.save();
    } else {
      console.log("Error. Only uio, ntnu or uib is available");
    }
  }
}

// Print graph
const printData = (plot) => {
  const { chart, legend, scale, __raw } = wunderbar(plot, {
    min: 0,
    length: 42,
    format: "0a",
  });

  console.log();
  console.log(chart);
  console.log();
  console.log(scale);
  console.log();
  console.log(legend);
};

function setColor(grade) {
  // Add colors
  switch (grade) {
    case "A":
      return "#56fed6";
    case "B":
      return "#59d7d7";
    case "C":
      return "#5baed9";
    case "D":
      return "#3380e3";
    case "E":
      return "#003fff";
    case "F":
      return "#0000FF";
    case "G":
      return "#59d7d7";
    case "H":
      return "#3380e3";
  }
}

const url = "https://api.nsd.no/dbhapitjener/Tabeller/hentJSONTabellData";

const payload = {
  tabell_id: 308,
  api_versjon: 1,
  statuslinje: "N",
  begrensning: "1000",
  kodetekst: "N",
  desimal_separator: ".",
  groupBy: ["Institusjonskode", "Emnekode", "Karakter", "Årstall"],
  sortBy: ["Karakter"],
  filter: [
    {
      variabel: "Institusjonskode",
      selection: { filter: "item", values: ["1110"] },
    },
    {
      variabel: "Emnekode",
      selection: {
        filter: "item",
        values: ["in1010-1"],
      },
    },
    {
      variabel: "Årstall",
      selection: {
        filter: "item",
        values: [`2019`],
      },
    },
  ],
};

inquirer
  .prompt([
    { type: "input", message: "Emnekode:", name: "emnekode" },
    { type: "input", message: "Årstall:", name: "year" },
  ])
  .then(async ({ emnekode, year }) => {
    // Edit payload with the provided input
    payload.filter[0].selection.values = [`${uni}`];
    payload.filter[1].selection.values = [`${emnekode.replace(/\s/g, "")}-1`];
    payload.filter[2].selection.values = [`${year}`];
    let data;
    try {
      const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
      data = await res.json();
    } catch (e) {
      console.log("Ingen emner funnet. Er det riktig emnekode for dette året?");
    }

    // Get total candidates
    let total = 0;
    data.forEach((e) => (total += Number(e["Antall kandidater totalt"])));
    const plot = data.map((e) => {
      // For bestått/ikkebestått
      if (e["Karakter"] === "G") {
        e.Karakter = "Bestått";
      } else if (e["Karakter"] === "H") {
        e.Karakter = "Ikke bestått";
      }
      const candidates = e["Antall kandidater totalt"];
      // Every grade with percentage
      const label = `${e.Karakter} (${Math.round(
        (candidates / total) * 100
      )}%)`;
      const color = setColor(e.Karakter);
      // Value: number, label = the grade
      return { value: candidates, label, color };
    });

    console.log(`\nResultater for ${emnekode.toUpperCase()} året ${year}`);
    console.log(`Antall kandidater: ${total}`);

    printData(plot);
    console.log();
  })
  .catch((error) => {
    if (error.isTtyError) {
      // Prompt couldn't be rendered in the current environment
    } else {
      // Something else when wrong
    }
  });
