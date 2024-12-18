
package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"os/exec"
	"github.com/gin-gonic/gin"
	"fmt"
)

type Response struct {
	ProcessedImage string `json:"processed_image"`
}

func main() {
	router := gin.Default()
	fmt.Println("Server is running on port 8086")

	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	router.POST("/api/process-image", func(c *gin.Context) {
		// Read the image from request body
		file, _, err := c.Request.FormFile("image")
		fmt.Println("Received request")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No image file received"})
			return
		}
		defer file.Close()
		
		// Read image data
		buf := new(bytes.Buffer)
		_, err = buf.ReadFrom(file)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read image"})
			return
		}
		imageData := buf.Bytes()
		
		// Convert image to base64
		base64Image := base64.StdEncoding.EncodeToString(imageData)
		
		// Prepare input for Python script
		input := map[string]string{"image": base64Image}
		inputJSON, err := json.Marshal(input)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare input"})
			return
		}
		
		// Execute Python script
		cmd := exec.Command("python3", "modelService.py")
		cmd.Stdin = bytes.NewBuffer(inputJSON)
		output, err := cmd.CombinedOutput()
		if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process image"})
			return
		}
		fmt.Println("Output before unmarshal:", string(output))
		start := bytes.Index(output, []byte("{"))
		end := bytes.LastIndex(output, []byte("}"))

		var response Response
		if start >= 0 && end >= 0 && end > start {
			cleanOutput := output[start : end+1]
			
			// Parse Python script output
			err = json.Unmarshal(cleanOutput, &response)
			if err != nil {
				fmt.Printf("Clean output content: %s\n", string(cleanOutput))
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"error": "Failed to parse output",
					"details": err.Error(),
				})
				return
			}
			imageBytes, err := base64.StdEncoding.DecodeString(response.ProcessedImage)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode image"})
				return
			}
			
			// Send raw image bytes with correct headers
			c.Header("Content-Type", "image/jpeg")
			c.Header("Content-Length", fmt.Sprintf("%d", len(imageBytes)))
			c.Data(http.StatusOK, "image/jpeg", imageBytes)
			
			// // Send response with success flag
			// c.JSON(http.StatusOK, gin.H{
			// 	"processed_image": response.ProcessedImage,
			// })
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Invalid JSON structure in output",
			})
		}
		// Send response with success flag
		c.JSON(http.StatusOK, gin.H{
			"processed_image": response.ProcessedImage,
		})
	})

	router.Run(":8086")
}