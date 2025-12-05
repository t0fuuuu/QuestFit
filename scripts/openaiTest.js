import OpenAI from "openai";
import dotenv from 'dotenv';
import fs from 'fs';
import { constants } from "buffer";

dotenv.config({ path: '.env.local' });

//console.log(process.env.OPEN_AI_API_KEY);

const rawData = fs.readFileSync("./archive/old-sample-data/allData.json", "utf-8");
const combinedHealthData = JSON.parse(rawData);
const jsonString = JSON.stringify(combinedHealthData);

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

const response = openai.responses.create({
  model: "gpt-5-nano",
  input: [
    {
        role:"system",
        content: [
            {
                type:"input_text", 
                text:`Analyse this user's health data carefully. You always gives concise, deterministic summaries.`
            },
            {
                type: "input_text",
                text: jsonString
            }
            // {
            //     role:"user",
            //     content:[
            //         { type: "input_text", file_id: fileUpload.id },
            //         {type: "input_text", text: "Provide a detailed summary, insights, and recommendations based on the data."}
            //     ]
            // }
        ]
    },
  ],
  instructions: "Return a JSON object with nested fields: summary, insights, recommendations, and in each one containing the sub fields. Do not return the original data. Do not have any mention of the numerical data statistics that was given.",
  store: true,
  reasoning:{
    effort:'high'
  },
  //max_output_tokens: 300
  //stream: true,
});

//response.then((result) => console.log(result.output_text));

for (let i = 1; i<= 20; i++) {
    console.log(`Running request: ${i}...`);

    const response = await openai.responses.create({
        model: "gpt-5-nano",
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
                    // {
                    //     role:"user",
                    //     content:[
                    //         { type: "input_text", file_id: fileUpload.id },
                    //         {type: "input_text", text: "Provide a detailed summary, insights, and recommendations based on the data."}
                    //     ]
                    // }
                ]
            },
        ],
        instructions: "Return a JSON object with fields: insights, recommendations, [short]insights, [short]recommendations, which is a single paragraph each, where the 2 labelled [short] are the short version of their long counterparts and they are limited to 30 words each. Order the paragraph by daily activity, exercise and cardio then sleep. Do not return the original data. Do not have any mention of the numerical data statistics that was given. Do not use ';' as much as possible unless necessary.",
        store: true,
        reasoning:{
            effort:'high'
        },
        //max_output_tokens: 300
        //stream: true,
        });

        fs.writeFileSync(`./archive/summaries/result_${i}.json`, response.output_text);
}