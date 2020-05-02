#!/usr/bin/env node
const inquirer = require('inquirer');
const fetch = require('node-fetch');
const wunderbar = require('@gribnoysup/wunderbar');

const printData = (plot) => {
    const { chart, legend, scale, __raw } = wunderbar(plot, {
        min: 0,
        length: 42,
        randomColorOptions: {

        },
        format: "0a"
    });

    console.log();
    console.log(chart);
    console.log();
    console.log(scale);
    console.log();
    console.log(legend);
};

const url = "https://api.nsd.no/dbhapitjener/Tabeller/hentJSONTabellData"

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
            selection: { filter: "item", values: ["1110"] }
        },
        {
            variabel: "Emnekode",
            selection: {
                filter: "item",
                values: ["in1010-1"]
            }
        },
        {
            variabel: "Årstall",
            selection: {
                filter: "item",
                values: [`2019`]
            }
        }
    ]
}

inquirer
    .prompt([
        { type: "input", message: "Emnekode:", name: "emnekode" },
        { type: "input", message: "Årstall:", name: "year" },
    ])
    .then(async ({ emnekode, year }) => {

        // Edit payload with the provided input
        payload.filter[1].selection.values = [`${emnekode.replace(/\s/g, "")}-1`];
        payload.filter[2].selection.values = [`${year}`];

        let data;
        try {
            const res = await fetch(url, {
                method: "POST",
                body: JSON.stringify(payload),
                headers: { "Content-Type": "application/json" }
            })
            data = await res.json();
        } catch (e) {
            console.log("Ingen emner funnet. Er det riktig emnekode for dette året?")
        }

        // Get total candidates
        let total = 0;
        data.forEach(e => total += Number(e['Antall kandidater totalt']))
        const plot = data.map(e => {

            // For bestått/ikkebestått
            if (e['Karakter'] === "G") {
                e.Karakter = "Bestått"
            } else if (e['Karakter'] === "H") {
                e.Karakter = "Ikke bestått"
            }
            const candidates = e['Antall kandidater totalt'];
            // Every grade with percentage 
            const label = `${e.Karakter} (${Math.round((candidates / total) * 100)}%)`
            return { value: candidates, label, }
        })

        // Add colors
        if (plot[0].label[0] === "A") {
            plot[0].color = "#56fed6";
            plot[1].color = "#59d7d7";
            plot[2].color = "#5baed9";
            plot[3].color = "#3380e3";
            plot[4].color = "#003fff";
            plot[5].color = "#0000FF";
        } else {
            // Betått/ikke bestått
            plot[0].color = "#59d7d7";
            plot[1].color = "#3380e3"
        }

        console.log(`\nResultater for ${emnekode.toUpperCase()} året ${year}`)
        console.log(`Antall kandidater: ${total}`)

        printData(plot);
        console.log()
    })
    .catch(error => {
        if (error.isTtyError) {
            // Prompt couldn't be rendered in the current environment
        } else {
            // Something else when wrong
        }
    });