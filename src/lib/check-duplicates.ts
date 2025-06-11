import { countries, Country } from "./countries";

function checkDuplicates() {
    const dialCodeCounts = new Map<string, number>();
    const compositeKeyCounts = new Map<string, number>();

    for (const country of countries) {
        // Check dialCode duplicates
        dialCodeCounts.set(country.dialCode, (dialCodeCounts.get(country.dialCode) || 0) + 1);

        // Check composite key duplicates
        const compositeKey = `${country.dialCode}-${country.isoCode}`;
        compositeKeyCounts.set(compositeKey, (compositeKeyCounts.get(compositeKey) || 0) + 1);
    }

    let foundDialCodeDuplicates = false;
    console.log("--- Dial Code Duplicates ---");
    for (const [dialCode, count] of dialCodeCounts.entries()) {
        if (count > 1) {
            foundDialCodeDuplicates = true;
            console.log(`Dial Code: ${dialCode}, Count: ${count}`);
            countries.filter(c => c.dialCode === dialCode).forEach(c => console.log(`  - ${c.name} (${c.isoCode})`));
        }
    }
    if (!foundDialCodeDuplicates) {
        console.log("No duplicate dial codes found.");
    }

    let foundCompositeKeyDuplicates = false;
    console.log("\n--- Composite Key (dialCode-isoCode) Duplicates ---");
    for (const [compositeKey, count] of compositeKeyCounts.entries()) {
        if (count > 1) {
            foundCompositeKeyDuplicates = true;
            console.log(`Composite Key: ${compositeKey}, Count: ${count}`);
            countries.filter(c => `${c.dialCode}-${c.isoCode}` === compositeKey).forEach(c => console.log(`  - ${c.name} (${c.isoCode})`));
        }
    }
    if (!foundCompositeKeyDuplicates) {
        console.log("No duplicate composite keys found.");
    }
}

checkDuplicates(); 