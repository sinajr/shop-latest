"use client";

import * as React from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countries, Country } from "@/lib/countries";
import Image from "next/image";

interface CountryCodeSelectProps {
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
}

export function CountryCodeSelect({ value, onValueChange, disabled }: CountryCodeSelectProps) {
    // Sort countries by dial code for better user experience
    const sortedCountries = React.useMemo(() => {
        return [...countries].sort((a, b) => {
            const dialA = parseInt(a.dialCode.replace('+', ''), 10);
            const dialB = parseInt(b.dialCode.replace('+', ''), 10);
            return dialA - dialB;
        });
    }, []);

    const initialInternalValue = React.useMemo(() => {
        const country = sortedCountries.find(c => c.dialCode === value);
        return country ? `${country.dialCode}-${country.isoCode}` : "";
    }, [value, sortedCountries]);

    const [internalValue, setInternalValue] = React.useState(initialInternalValue);

    React.useEffect(() => {
        const country = sortedCountries.find(c => c.dialCode === value);
        setInternalValue(country ? `${country.dialCode}-${country.isoCode}` : "");
    }, [value, sortedCountries]);

    const handleSelectChange = (selectedValueAndIso: string) => {
        setInternalValue(selectedValueAndIso);
        const dialCode = selectedValueAndIso.split('-')[0];
        onValueChange(dialCode);
    };

    return (
        <Select onValueChange={handleSelectChange} value={internalValue} disabled={disabled}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder="Select country code">
                    {internalValue ? (
                        <div className="flex items-center">
                            <Image
                                src={sortedCountries.find(country => `${country.dialCode}-${country.isoCode}` === internalValue)?.flag || ""}
                                alt="flag"
                                width={20}
                                height={15}
                                className="mr-2 rounded"
                            />
                            {internalValue.split('-')[0]}
                        </div>
                    ) : (
                        "Select country code"
                    )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    {sortedCountries.map((country: Country) => (
                        <SelectItem key={`${country.dialCode}-${country.isoCode}`} value={`${country.dialCode}-${country.isoCode}`}>
                            <div className="flex items-center">
                                <Image
                                    src={country.flag}
                                    alt={`${country.name} flag`}
                                    width={20}
                                    height={15}
                                    className="mr-2 rounded"
                                />
                                <span>{country.name} ({country.dialCode})</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
} 