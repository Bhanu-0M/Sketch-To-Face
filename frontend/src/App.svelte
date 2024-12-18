<script>
	let inputImage = null;
	let outputImage = null;
	let sliderPosition = 50;
	let loading = false;
	let selectedFile = null;
	
	async function resizeImage(imageUrl, maxWidth = 800) {
		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () => {
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');
				
				let width = img.width;
				let height = img.height;
				
				if (width > maxWidth) {
					height = (maxWidth * height) / width;
					width = maxWidth;
				}
				
				canvas.width = width;
				canvas.height = height;
				ctx.drawImage(img, 0, 0, width, height);
				resolve(canvas.toDataURL('image/jpeg', 0.9));
			};
			img.src = imageUrl;
		});
	}

	async function handleFileSelect(event) {
		selectedFile = event.target.files[0];
		if (selectedFile) {
			const tempUrl = URL.createObjectURL(selectedFile);
			inputImage = await resizeImage(tempUrl);
			URL.revokeObjectURL(tempUrl);
		}
	}

	async function handleSubmit() {
		if (!selectedFile) return;
		
		loading = true;
		const formData = new FormData();
		formData.append('image', selectedFile);

		try {
			const response = await fetch('http://localhost:8086/api/process-image', {
				method: 'POST',
				body: formData
			});
			const imageBlob = await response.blob();
			const tempUrl = URL.createObjectURL(imageBlob);
			outputImage = await resizeImage(tempUrl);
			URL.revokeObjectURL(tempUrl);
		} catch (error) {
			console.error('Error:', error);
		} finally {
			loading = false;
		}
	}

  
	function handleSliderMove(event) {
		const rect = event.currentTarget.getBoundingClientRect();
		const x = event.clientX - rect.left;
		sliderPosition = (x / rect.width) * 100;
	}
</script>

<svelte:head>
	<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
	<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
	<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css" rel="stylesheet">
</svelte:head>

<main class="container py-5">
	<div class="row justify-content-center mb-5">
		<div class="col-md-8 text-center">
			<div class="upload-section p-5 bg-gradient rounded-4 shadow-lg">
				<h2 class="text-white mb-4">Upload sketch</h2>
				<label class="btn btn-outline-light btn-lg me-3" for="fileInput">
					<i class="bi bi-cloud-upload-fill me-2"></i>Choose Image
					<input 
						id="fileInput"
						type="file" 
						accept="image/*" 
						on:change={handleFileSelect}
						class="d-none"
					/>
				</label>
				
				{#if selectedFile}
				<button 
					class="btn btn-glow btn-lg"
					on:click={handleSubmit}
					disabled={loading}
				>
					<i class="bi bi-gear-fill me-2"></i>Process Image
				</button>
				{/if}
			</div>
		</div>
	</div>
  
	{#if loading}
		<div class="loading-overlay">
			<div class="spinner-border text-primary" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
	{/if}

	{#if inputImage && !outputImage}
	<div class="row justify-content-center">
		<div class="col-md-10">
			<img src={inputImage} alt="Input" class="img-fluid rounded-4 shadow-lg" />
		</div>
	</div>
	{/if}
  
	{#if inputImage && outputImage}
		<div class="row justify-content-center">
			<div class="col-md-10">
				<div class="comparison-container rounded-4 shadow-lg">
					<div 
						class="comparison-slider"
						on:mousemove={handleSliderMove}
						on:touchmove|preventDefault={handleSliderMove}
					>
						<img src={inputImage} alt="Input" class="img-fluid comparison-image" />
						<div 
							class="comparison-overlay"
							style="width: {sliderPosition}%"
						>
							<img src={outputImage} alt="Output" class="comparison-image" />
						</div>
						<div 
							class="slider-handle"
							style="left: {sliderPosition}%"
						/>
					</div>
				</div>
			</div>
		</div>
	{/if}
</main>

<style>
	:global(body) {
		background: linear-gradient(135deg, #1a1a2e, #16213e);
		color: #fff;
		font-family: 'Roboto', sans-serif;
		margin: 0;
	}

	.upload-section {
		background: rgba(30, 41, 59, 0.7);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	h2 {
		font-size: 2.5rem;
		font-weight: 700;
		color: #fff;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.comparison-container {
		position: relative;
		overflow: hidden;
		background: #1e293b;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.comparison-slider {
		position: relative;
		width: 100%;
		height: 500px;
		cursor: col-resize;
	}

	.comparison-image {
		position: absolute;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.comparison-overlay {
		position: absolute;
		height: 100%;
		overflow: hidden;
	}

	.slider-handle {
		position: absolute;
		width: 5px;
		background: #60a5fa;
		cursor: col-resize;
		transform: translateX(-50%);
	}

	.slider-handle::after {
		content: '';
		position: absolute;
		width: 40px;
		height: 40px;
		background: #60a5fa;
		border-radius: 50%;
		border: 3px solid #fff;
		top: 50%;
		transform: translate(-50%, -50%);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
	}

	.loading-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(15, 23, 42, 0.9);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1050;
	}

	.spinner-border {
		width: 4rem;
		height: 4rem;
	}

	.btn-glow {
        background: linear-gradient(135deg, #342e91, #397cce);
        color: rgb(0, 0, 0);
        border: none;
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
    }

    .btn-glow:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(79, 70, 229, 0.4);
        color: white;
    }

    .btn-glow:active {
        transform: translateY(0);
    }

    .btn-glow:disabled {
        background: linear-gradient(135deg, #6b7280, #9ca3af);
        transform: none;
        box-shadow: none;
    }
</style>
