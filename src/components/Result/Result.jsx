import React, { useState } from "react";
import "./Result.css";
//Generation Packages
import Generation from "../../generation/generation_pb";
import GenerationService from "../../generation/generation_pb_service";
import { grpc } from "@improbable-eng/grpc-web";

//React styling libraries
import {AiOutlineColumnWidth,AiOutlineColumnHeight} from "react-icons/ai"
import { IconContext } from "react-icons";
import { Rings } from 'react-loader-spinner';

//States
export default function Result() {
  const [buttonLoading, setButtonLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState({
    data: "iVBORw0KGgoAAAANSUhEUgAAAgAAAAIAAQMAAADOtka5AAAABlBMVEUAAAD///+l2Z/dAAAAAXRSTlMAQObYZgAAAAFiS0dEAf8CLd4AAAA2SURBVBgZ7cEBAQAAAIKg/q92SMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM4FggAAAbUHaq4AAAAASUVORK5CYII=",
  });
  const [width , setWidth] = useState(512)
  const [height , setHeight] = useState(512)


const data = { inputs: prompt };
  var options = {
    headers: {
      Authorization: process.env.REACT_APP_API_TOKEN,
      accept: "application/json",
    },
  };

//Functions to handle changes
  const handleChange = (e) => {
    setPrompt(e.target.value);
  }
  const handleWidthChange = (e) => {
    setWidth(e.target.value)
  }
  const handleHeightChange = (e) => {
    setHeight(e.target.value)
  }

  //Fetching the data 
  async function handleSubmit(event) {
    setButtonLoading(true);
    const imageParams = new Generation.ImageParameters();
    imageParams.setWidth(width);
    imageParams.setHeight(height);
    //imageParams.addSeed(1234);
    imageParams.setSamples(1);
    imageParams.setSteps(50);
    const transformType = new Generation.TransformType();
    transformType.setDiffusion(Generation.DiffusionSampler.SAMPLER_K_DPMPP_2M);
    imageParams.setTransform(transformType);
    const request = new Generation.Request();
    request.setEngineId("stable-diffusion-512-v2-1");
    request.setRequestedType(Generation.ArtifactType.ARTIFACT_IMAGE);
    request.setClassifier(new Generation.ClassifierParameters());

    // Use a CFG scale of `13`
    const samplerParams = new Generation.SamplerParameters();
    samplerParams.setCfgScale(13);
    const stepParams = new Generation.StepParameter();
    const scheduleParameters = new Generation.ScheduleParameters();

    // Set the schedule to `0`, this changes when doing an initial image generation
    stepParams.setScaledStep(0);
    stepParams.setSampler(samplerParams);
    stepParams.setSchedule(scheduleParameters);

    imageParams.addParameters(stepParams);
    request.setImage(imageParams);

    // Set our text prompt
    const promptText = new Generation.Prompt();
    promptText.setText(prompt);
    request.addPrompt(promptText);
    
    // Authenticate using your API key, don't commit your key to a public repository!
    const metadata = new grpc.Metadata();
    metadata.set(
      "Authorization",
      "Bearer " + process.env.REACT_APP_DREAM_TOKEN
    );

    // Create a generation client
    const generationClient = new GenerationService.GenerationServiceClient(
      "https://grpc.stability.ai",
      {}
    );

    // Send the request using the `metadata` with our key from earlier
    const generation = generationClient.generate(request, metadata);

    // Set up a callback to handle data being returned
    generation.on("data", (data) => {
      data.getArtifactsList().forEach((artifact) => {
        // Oh no! We were filtered by the NSFW classifier!
        if (
          artifact.getType() === Generation.ArtifactType.ARTIFACT_TEXT &&
          artifact.getFinishReason() === Generation.FinishReason.FILTER
        ) {
          return console.error(
            "Your image was filtered by the NSFW classifier."
          );
        }

        // Make sure we have an image
        if (artifact.getType() !== Generation.ArtifactType.ARTIFACT_IMAGE)
          return;

        // You can convert the raw binary into a base64 string
        const base64Image = btoa(
          new Uint8Array(artifact.getBinary()).reduce(
            (data, byte) => data + String.fromCodePoint(byte),
            ""
          )
        );

        // Here's how you get the seed back if you set it to `0` (random)
        const seed = artifact.getSeed();

        // We're done!
        setResult({ data: base64Image });
        setButtonLoading(false);
      });
    });

    // Anything other than `status.code === 0` is an error
    generation.on("status", (status) => {
      if (status.code === 0) return;
      console.error(
        "Your image could not be generated. You might not have enough credits."
      );
    });
  }

  return (
    <div className="mx-auto my-5  max-w-4xl">
      <div className="flex p-9 ">
        <input
          placeholder="Enter your prompt"
          className="w-10/12 overflow-hidden p-2 pl-4 rounded-lg bg-[#29282B] text-white tracking-wide	shadow-lg"
          onChange={handleChange}
          value={prompt}
        ></input>
        <button
          className=" flex justify-center w-44 px-6 py-2.5 mx-3 text-sm font-medium transition ease-in-out delay-150 bg-blue-500 hover:-translate-y-1 hover:scale-110 hover:bg-indigo-500 duration-300 rounded-lg"
          type="submit"
          disabled={buttonLoading}
          onClick={handleSubmit}
        >
        {buttonLoading ? <Rings height="30" width="30" color= "white" radius="3" wrapperStyle={{}} wrapperClass="" visible={true} ariaLabel="rings-loading"/> : "Generate"}
          
        </button>
      </div>
      {/* Options */}
      <div className="options flex justify-around">
        <div className="width flex">
          <IconContext.Provider value={{ color: "white", size:"2em" , className:"mr-3"}}>
            <AiOutlineColumnWidth />
          </IconContext.Provider>
            <input 
              onChange={handleWidthChange}
              value={width}
              className="p-2 pl-4 rounded-lg bg-[#29282B] text-white tracking-wide	shadow-lg"
              placeholder="width"
              type="number"
            />
        </div>
        <div className="ml-3 height flex">
          <IconContext.Provider value={{ color: "white", size:"2em" , className:"mr-3" }}>
            <AiOutlineColumnHeight/>
          </IconContext.Provider>
          <input 
            onChange={handleHeightChange  }
            value={height}
            className="p-2 pl-4 rounded-lg bg-[#29282B] text-white tracking-wide	shadow-lg"
            placeholder="height"
            type="number"
          />
        </div>
      </div>
      <img
        className="object-cover mx-auto my-5 justify-center rounded-lg"
        alt=""
      />
      <img
        src={`data:image/png;base64,${result.data}`}
        className="object-cover mx-auto my-5 justify-center border rounded-lg"
        alt=""
      />
    </div>
  );
}
