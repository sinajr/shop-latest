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

    return (
        <Select onValueChange={onValueChange} value={value} disabled={disabled}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder="Select country code">
                    {value ? (
                        <div className="flex items-center">
                            <Image
                                src={sortedCountries.find(country => country.dialCode === value.split('-')[0])?.flag || ""}
                                alt="flag"
                                width={20}
                                height={15}
                                className="mr-2 rounded"
                            />
                            {value.split('-')[0]}
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