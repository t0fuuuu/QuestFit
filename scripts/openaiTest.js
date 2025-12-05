import OpenAI from "openai";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { constants } from "buffer";

// Load environment variables from .env file
dotenv.config();

if (!process.env.OPEN_AI_API_KEY) {
    console.error("Error: OPEN_AI_API_KEY is not set in environment variables.");
    process.exit(1);
}

//console.log(process.env.OPEN_AI_API_KEY);

const rawData = fs.readFileSync("./archive/old-sample-data/allData.json", "utf-8");
const combinedHealthData = JSON.parse(rawData);
const jsonString = JSON.stringify(combinedHealthData);

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

// Check if running on Vercel (or any read-only environment)
const isVercel = process.env.VERCEL === '1';

const runAnalysis = async () => {
    // Reduced to 1 iteration for testing on Vercel to avoid timeouts
    // Change this back to 20 if running locally or if you have a long timeout
    const iterations = isVercel ? 1 : 20; 

    for (let i = 1; i <= iterations; i++) {
        console.log(`Running request: ${i}...`);

        try {
            const response = await openai.responses.create({
                model: "gpt-4o-mini", // Updated to a valid model name (gpt-5-nano isn't standard public yet)
                input: [
                    {
                        role:"system",
                        content: [
                            {
                                type:"input_text", 
                                text:`Analyse this user's health data carefully. Assume the 2nd person perspective of the cadet who is viewing his own statistics. This user is a military cadet who is in officer cadet school, and is training to be a digital and intelligence officer. Sitting in front of a computer and listening to lectures are the norm for this user. Keep in mind that the cadet does not have much decision over his own schedule. There are  2-3 physical conducts per week. Try not to mention the cause, but more of the impact.  You always gives concise, deterministic summaries.`
                            },
                            {
                                type: "input_text",
                                text: jsonString
                            }
                        ]
                    },
                ],
                instructions: "Return a JSON object with fields: insights, recommendations, [short]insights, [short]recommendations, which is a single paragraph each, where the 2 labelled [short] are the short version of their long counterparts and they are limited to 30 words each. Order the paragraph by daily activity, exercise and cardio then sleep. Do not return the original data. Do not have any mention of the numerical data statistics that was given. Do not use ';' as much as possible unless necessary.",
                store: true,
                reasoning:{
                    effort:'high'
                },
            });

            if (isVercel) {
                console.log(`[Result ${i}]:`, response.output_text);
                // On Vercel, we can't write to persistent storage easily. 
                // We could write to /tmp but it vanishes.
            } else {
                const outputDir = './archive/summaries';
                if (!fs.existsSync(outputDir)){
                    fs.mkdirSync(outputDir, { recursive: true });
                }
                fs.writeFileSync(`${outputDir}/result_${i}.json`, response.output_text);
                console.log(`Saved result_${i}.json`);
            }
        } catch (error) {
            console.error(`Error in request ${i}:`, error);
        }
    }
};

runAnalysis();