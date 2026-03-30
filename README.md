# Agroverse AI Plant Disease Detection System

## Live Demo

 https://agroverse-web-1-1.vercel.app

---

## Overview

Agroverse is a full-stack AI web application that detects plant diseases from images using a trained machine learning model and a modern React (Next.js) frontend.

---

## Problem

Farmers often struggle to identify plant diseases early, leading to crop damage and reduced yield.

---

## Solution

Agroverse allows users to:

* Upload a plant leaf image
* Get instant disease prediction
* Take early action

---

## Tech Stack

### Frontend

* React (Next.js)
* Tailwind CSS

### Backend / ML

* Python (ML model)
* Image classification using CNN model trained on Efficient Model from HuggingFace
* Dataset ( PlantVillage from Kaggle , Imaghes from nearby areas and google scrappeed images )

---

## System Flow

```
User → Upload Image → API → ML Model → Prediction → UI Display
```

---

## Features

*  Image upload & prediction
*  Fast response
*  Clean UI with Tailwind
*  Full-stack integration

---

## Project Structure

```
src/ → React (Next.js frontend)
components/ → UI components
config files → Tailwind, Next.js setup
```

---

## Run Locally

```
npm install
npm run dev
```

---

## Future Improvements

* Improve model accuracy
* Add more plant categories
* Optimize backend performance
* Better UI/UX

---

⭐ If you like this project, give it a star!
