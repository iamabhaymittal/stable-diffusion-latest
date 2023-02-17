import React, { useState } from "react";
import Generation from "../../generation/generation_pb";
import GenerationService from "../../generation/generation_pb_service";
import { grpc } from "@improbable-eng/grpc-web";
import "./Result.css";
import { Rings } from 'react-loader-spinner';
export default function Result() {
  const [buttonLoading, setButtonLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState({
    data: "iVBORw0KGgoAAAANSUhEUgAAAgAAAAIAAQMAAADOtka5AAAABlBMVEUAAAD///+l2Z/dAAAAAXRSTlMAQObYZgAAAAFiS0dEAf8CLd4AAAA2SURBVBgZ7cEBAQAAAIKg/q92SMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM4FggAAAbUHaq4AAAAASUVORK5CYII=",
  });

  const data = { inputs: prompt };
  var options = {
    headers: {
      Authorization: process.env.REACT_APP_API_TOKEN,
      accept: "application/json",
    },
  };

  function handleChange(event) {
    setPrompt(event.target.value);
  }
  async function handleSubmit(event) {
    setButtonLoading(true);
    const imageParams = new Generation.ImageParameters();
    imageParams.setWidth(512);
    imageParams.setHeight(512);
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

    //await axios.post(API_URL, data, options).then((res) => setResult(res));
    // console.log(result.data);
  }

  return (
    <div className="mx-auto my-5  max-w-4xl">
      <div className="flex p-9 ">
        <input
          placeholder="Enter your prompt"
          className="w-10/12 overflow-hidden p-2 pl-4 rounded-lg bg-[#221F20] text-white tracking-widest	"
          onChange={handleChange}
          value={prompt}
        ></input>
        <button
          className=" flex justify-center w-44 px-6 py-2.5 mx-3 text-sm font-medium transition ease-in-out delay-150 bg-blue-500 hover:-translate-y-1 hover:scale-110 hover:bg-indigo-500 duration-300 rounded-xl"
          type="submit"
          disabled={buttonLoading}
          onClick={handleSubmit}
        >
          {/* {buttonLoading ? "Loading" : "Generate"} */}
          {buttonLoading ? <Rings height="30" width="30" color= "white" radius="3" wrapperStyle={{}} wrapperClass="" visible={true} ariaLabel="rings-loading"/> : "Generate"}
          {/* {buttonLoading ? <InfinitySpin width='100' color="white"/> : "Generate"} */}
          
        </button>
      </div>
      <img
        // src={imgURL}
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
