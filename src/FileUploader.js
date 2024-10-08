import React, { useState, useEffect } from "react";
import { loadGapiInsideDOM, gapi } from "gapi-script";
import {
  Button,
  Grid,
  Box,
  Typography,
  Paper,
  Menu,
  MenuItem,
  ListItemIcon,
} from "@mui/material";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx"; // Ensure HeadingLevel is imported
import * as mammoth from "mammoth";
import btnImage from "./assests/btn.png";
import btnDownloadImage from "./assests/DownloadIcon.png";
import PDF from "./assests/pdf.png";
import logo from "./assests/logoo.png";
import word from "./assests/word.png";
import top from "./assests/top.png";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import html2pdf from "html2pdf.js";
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const CLIENT_ID = "";
const API_KEY = "";
const SCOPES = "";

const FileUploadEssay = () => {
  const [fileContent, setFileContent] = useState("");
  const [essayText, setEssayText] = useState("");
  const [showMore, setShowMore] = useState(false); // State for 'Show more'
  const [anchorEl, setAnchorEl] = useState(null); // State for dropdown menu
  const [menuAnchor, setMenuAnchor] = useState(null);
  const isMenuOpen = Boolean(menuAnchor);

  useEffect(() => {
    const start = () => {
      gapi.load("client:auth2", () => {
        gapi.client.init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          discoveryDocs: [
            "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
          ],
          scope: SCOPES,
        });
      });
    };
    loadGapiInsideDOM().then(() => start());
  }, []);

  const handleGoogleDriveUpload = async () => {
    try {
      const authInstance = gapi.auth2.getAuthInstance();
  
      // Ensure the user is signed in
      if (!authInstance.isSignedIn.get()) {
        await authInstance.signIn();
      }
  
      const accessToken = authInstance.currentUser.get().getAuthResponse().access_token;
  
      // Convert the essayText to a Word document using docx library
      const parser = new DOMParser();
      const doc = parser.parseFromString(essayText, "text/html");
  
      const paragraphs = [];
      doc.body.childNodes.forEach((node) => {
        const textRuns = [];
  
        node.childNodes.forEach((childNode) => {
          if (childNode.nodeType === 3) {
            textRuns.push(new TextRun({ text: childNode.textContent, font: "Arial", size: 24 }));
          } else if (childNode.nodeType === 1) {
            let run = new TextRun({ text: childNode.textContent, font: "Arial", size: 24 });
  
            if (childNode.tagName === "STRONG" || childNode.tagName === "B") {
              run = new TextRun({ text: childNode.textContent, bold: true, font: "Arial", size: 24 });
            } else if (childNode.tagName === "EM" || childNode.tagName === "I") {
              run = new TextRun({ text: childNode.textContent, italics: true, font: "Arial", size: 24 });
            } else if (childNode.tagName === "U") {
              run = new TextRun({ text: childNode.textContent, underline: {}, font: "Arial", size: 24 });
            }
  
            if (childNode.tagName === "H1") {
              run = new TextRun({ text: childNode.textContent, bold: true, size: 48, font: "Arial" });
              paragraphs.push(new Paragraph({ children: [run], heading: HeadingLevel.HEADING_1 }));
            } else if (childNode.tagName === "H2") {
              run = new TextRun({ text: childNode.textContent, bold: true, size: 36, font: "Arial" });
              paragraphs.push(new Paragraph({ children: [run], heading: HeadingLevel.HEADING_2 }));
            } else if (childNode.tagName === "H3") {
              run = new TextRun({ text: childNode.textContent, bold: true, size: 32, font: "Arial" });
              paragraphs.push(new Paragraph({ children: [run], heading: HeadingLevel.HEADING_3 }));
            } else {
              textRuns.push(run);
            }
          }
        });
  
        if (textRuns.length > 0) {
          paragraphs.push(new Paragraph({ children: textRuns }));
        }
      });
  
      const docxDocument = new Document({
        sections: [
          {
            properties: {},
            children: paragraphs,
          },
        ],
      });
  
      // Convert to a blob
      const blob = await Packer.toBlob(docxDocument);
  
      // Create a unique filename using a timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const uniqueFilename = `essay-${timestamp}.docx`;
  
      // Form data for uploading the Word document
      const metadata = {
        name: uniqueFilename, // Unique filename at Google Drive
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
  
      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
      form.append("file", blob);
  
      // Upload the Word document to Google Drive
      fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method: "POST",
        headers: new Headers({
          Authorization: `Bearer ${accessToken}`,
        }),
        body: form,
      })
        .then((res) => res.json())
        .then((data) => {
          alert("Word document uploaded to Google Drive as " + uniqueFilename);
          console.log("Uploaded file:", data);
        })
        .catch((error) => {
          console.error("Error uploading Word document:", error);
        });
    } catch (error) {
      console.error("Google Drive authentication error:", error);
    }
  };
  

  const handleMenuOpen = (event) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];

    if (file && file.name.endsWith(".pdf")) {
      const pdfUrl = URL.createObjectURL(file); // Create a blob URL for the PDF
      setFileContent(
        `<iframe src="${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0" width="100%" height="600px"></iframe>` // Embed the PDF without toolbar
      );
    } else if (file && file.name.endsWith(".docx")) {
      // Handle DOCX files (same as before)
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target.result;
        try {
          const { value } = await mammoth.convertToHtml({ arrayBuffer });
          const formattedContent = formatTextAsParagraphs(value);
          setFileContent(formattedContent);
        } catch (err) {
          console.error("Error reading DOCX file:", err);
          setFileContent("Error reading DOCX file.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (file && file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFileContent(`<pre>${event.target.result}</pre>`);
      };
      reader.readAsText(file);
    } else {
      setFileContent(
        "Unsupported file format. Please upload a .txt, .docx, or .pdf file."
      );
    }
  };

  // Helper function to manage paragraph formatting with 4-5 lines per paragraph
  const formatTextAsParagraphs = (text) => {
    const sentences = text.split(". ").map((sentence) => sentence.trim() + ".");

    // Create a new array to group sentences into paragraphs
    const paragraphs = [];
    let currentParagraph = "";

    sentences.forEach((sentence, index) => {
      currentParagraph += sentence + " ";

      // Break into new paragraph every 3-4 sentences (about 4-5 lines)
      if ((index + 1) % 4 === 0) {
        paragraphs.push(
          `<p style="margin-bottom: 15px;">${currentParagraph.trim()}</p>`
        );
        currentParagraph = ""; // Reset for the next paragraph
      }
    });

    // If there is remaining text that didn't form a full paragraph
    if (currentParagraph) {
      paragraphs.push(
        `<p style="margin-bottom: 15px;">${currentParagraph.trim()}</p>`
      );
    }

    return paragraphs.join("");
  };

  // Helper function to remove HTML tags
  const stripHtmlTags = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  };

  const handleDownload = async (format) => {
    const quillHtml = essayText; // This is the HTML content from the ReactQuill editor

    if (format === "docx") {
      const parser = new DOMParser();
      const doc = parser.parseFromString(quillHtml, "text/html");

      const paragraphs = [];
      doc.body.childNodes.forEach((node) => {
        const textRuns = [];

        node.childNodes.forEach((childNode) => {
          if (childNode.nodeType === 3) {
            // Text node, normal style
            textRuns.push(
              new TextRun({
                text: childNode.textContent,
                font: "Arial",
                size: 24,
              })
            );
          } else if (childNode.nodeType === 1) {
            let run = new TextRun({
              text: childNode.textContent,
              font: "Arial",
              size: 24,
            });

            // Handle text styles based on the HTML tags
            if (childNode.tagName === "STRONG" || childNode.tagName === "B") {
              run = new TextRun({
                text: childNode.textContent,
                bold: true,
                font: "Arial",
                size: 24,
              });
            } else if (
              childNode.tagName === "EM" ||
              childNode.tagName === "I"
            ) {
              run = new TextRun({
                text: childNode.textContent,
                italics: true,
                font: "Arial",
                size: 24,
              });
            } else if (childNode.tagName === "U") {
              run = new TextRun({
                text: childNode.textContent,
                underline: {},
                font: "Arial",
                size: 24,
              });
            }

            // Handle heading styles
            if (childNode.tagName === "H1") {
              run = new TextRun({
                text: childNode.textContent,
                bold: true,
                size: 48,
                font: "Arial",
              }); // Heading 1
              paragraphs.push(
                new Paragraph({
                  children: [run],
                  heading: HeadingLevel.HEADING_1, // Applying the correct heading level
                })
              );
            } else if (childNode.tagName === "H2") {
              run = new TextRun({
                text: childNode.textContent,
                bold: true,
                size: 36,
                font: "Arial",
              }); // Heading 2
              paragraphs.push(
                new Paragraph({
                  children: [run],
                  heading: HeadingLevel.HEADING_2, // Applying the correct heading level
                })
              );
            } else if (childNode.tagName === "H3") {
              run = new TextRun({
                text: childNode.textContent,
                bold: true,
                size: 32,
                font: "Arial",
              }); // Heading 3
              paragraphs.push(
                new Paragraph({
                  children: [run],
                  heading: HeadingLevel.HEADING_3, // Applying the correct heading level
                })
              );
            } else {
              textRuns.push(run);
            }
          }
        });

        // If the current node is not a heading, create a normal paragraph
        if (textRuns.length > 0) {
          paragraphs.push(new Paragraph({ children: textRuns }));
        }
      });

      const docxDocument = new Document({
        sections: [
          {
            properties: {},
            children: paragraphs,
          },
        ],
      });

      const blob = await Packer.toBlob(docxDocument);
      const element = document.createElement("a");
      element.href = URL.createObjectURL(blob);
      element.download = "essay.docx";
      document.body.appendChild(element);
      element.click();
    } else if (format === "pdf") {
      // Convert the HTML content from ReactQuill to PDF using html2pdf.js
      const options = {
        margin: 1,
        filename: "essay.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      };

      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = quillHtml;

      html2pdf().from(tempDiv).set(options).save();
    }
  };

  const modules = {
    toolbar: [
      // Font family and size
      [{ font: [] }, { size: [] }],

      // Font style: bold, italic, underline, strike
      ["bold", "italic", "underline", "strike"],

      // Subscript and superscript
      [{ script: "sub" }, { script: "super" }],

      // Headers (e.g., H1, H2, etc.)
      [{ header: 1 }, { header: 2 }],

      // Text alignment and list options
      [
        { list: "ordered" },
        { list: "bullet" },
        { indent: "-1" },
        { indent: "+1" },
      ],

      // Text alignments
      [{ align: [] }],

      // Clean formatting
      ["clean"],
    ],
  };

  // Menu handling for dropdown
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Toggle 'Show more' functionality
  const toggleShowMore = () => {
    setShowMore(!showMore);
  };

  return (
    <>
      <div className="appHolder">
        {/* <Container> */}

        {/* </Container> */}
        {/* <Container style={{ height: "100%" }}> */}
        <Grid container spacing={0} sx={{ mt: 0 }}>
          {/* Left Side - File Content */}
          <Grid item xs={12} md={12} lg={5}>
            <div class="topButtonHolder">
              <img
                src={logo}
                alt="Upload"
                className="logoImg"
                style={{ width: "150px" }}
              />
              <Button
                component="label"
                className="uploadButton mb-20px"
                startIcon={
                  <img
                    src={btnImage}
                    alt="Upload"
                    style={{ width: "20px", height: "17px" }}
                  />
                }
              >
                Upload Passage
                <input
                  type="file"
                  hidden
                  accept=".txt,.docx,.pdf"
                  onChange={handleFileUpload}
                />
              </Button>
            </div>
            <div className="overflow-hidden">
              <Paper
                variant="outlined"
                elevation={1}
                class="cardController"
                sx={{
                  p: 2,
                  me: 2,
                  border: "1px solid #F1F1F1",
                  borderRadius: "22px",
                  overflowY: "scroll",
                  "&::-webkit-scrollbar": {
                    width: "6px", // Width of the scrollbar
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "#c1c1c1", // Color of the scrollbar thumb
                    borderRadius: "10px", // Rounded scrollbar
                  },
                  "&::-webkit-scrollbar-track": {
                    backgroundColor: "#f1f1f1", // Color of the scrollbar track
                  },
                }}
              >
                <Box sx={{ mt: 2, overflowY: "auto" }}>
                  {fileContent ? (
                    <Typography>
                      <div
                        dangerouslySetInnerHTML={{
                          __html: fileContent,
                        }}
                      />
                      {/* Show limited content */}
                      {/* {fileContent.length > 200 && (
                      <Button onClick={toggleShowMore}>
                        {showMore ? "Show less" : "Show more"}
                      </Button>
                    )} */}
                    </Typography>
                  ) : (
                    <Typography class="paratxt mx-auto">
                      No Passage uploaded yet.
                    </Typography>
                  )}
                </Box>
              </Paper>
            </div>
          </Grid>

          {/* Right Side - Essay Writing with Rich Text Editor */}
          <Grid item xs={12} md={12} lg={7}>
            <div style={{ display: "flex", marginLeft: "20px" }}>
              <span>
                <img className="marginTop" src={top}></img>
              </span>{" "}
              <div className="paraHolder">
                <p class="paratxt">
                  Write your multi-paragraph essay for an academic audience in
                  the space provided.
                </p>
                {/* <p class="paratxt2">Last edited 25 minutes ago</p> */}
              </div>
            </div>
            <Paper
              variant="outlined"
              className="cardHolder2"
              elevation={1}
              sx={{
                p: 2,
                ml: 2,
                borderRadius: "22px",
                border: "1px solid #F1F1F1",
              }}
            >
              <Typography variant="h6" gutterBottom>
                {/* <div style={{ display: "flex" }}>
                  <span>
                    <img className="marginTop" src={top}></img>
                  </span>{" "}
                  <div>
                    <p class="paratxt">
                      Write your multi-paragraph essay for an academic audience
                      in the space provided
                    </p>
                    <p class="paratxt2">
                      Last edited 25 minutes ago by{" "}
                      <span style={{ color: "#0062FF" }}>John Doe</span>
                    </p>
                  </div>
                </div> */}
              </Typography>

              {/* ReactQuill Editor */}
              <ReactQuill
                theme="snow"
                value={essayText}
                onChange={setEssayText}
                placeholder="Write your essay here..."
                style={{ height: "280px" }}
                formats={[
                  "header",
                  "font",
                  "size",
                  "bold",
                  "italic",
                  "underline",
                  "strike",
                  "blockquote",
                  "list",
                  "bullet",
                  "indent",
                  "link",
                  "image",
                  "video",
                ]}
                modules={modules}
              />

              <Box
                className="btnwrapper"
                sx={{
                  mt: 10,
                  display: "flex",
                  justifyContent: "end",
                  gap: 2,
                  borderRadius: "15px",
                }}
              >
                {/* Dropdown Button for Download Options */}
                <Button
                  variant="contained"
                  class="newDownloadBtn"
                  onClick={handleClick}
                  disableRipple
                >
                  <img src={btnDownloadImage} class="downloadImg"></img>
                  Download
                </Button>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  sx={{ borderRadius: "15px" }}
                >
                  {/* <MenuItem onClick={() => handleDownload("txt")}>
                    Download as .txt
                  </MenuItem> */}
                  <MenuItem onClick={() => handleDownload("docx")}>
                    <ListItemIcon>
                      <img src={word}></img>
                    </ListItemIcon>
                    <Typography variant="inherit" noWrap>
                      Download as <strong className="wordColor">.docx</strong>{" "}
                      format
                    </Typography>
                  </MenuItem>
                  <MenuItem onClick={() => handleDownload("pdf")}>
                    <ListItemIcon>
                      <img src={PDF}></img>
                    </ListItemIcon>
                    <Typography variant="inherit" noWrap>
                      Download in <strong className="pdfColor">.pdf</strong>{" "}
                      format
                    </Typography>
                  </MenuItem>
                  {/* <MenuItem onClick={() => handleDownload("xlsx")}>
                    Download as .xlsx
                  </MenuItem> */}
                </Menu>
                {/* <div>
                  <Button
                    class="newDownloadBtn"
                    variant="contained"
                    endIcon={<ArrowDropDownIcon />}
                    onClick={handleMenuOpen}
                  >
                    Download
                  </Button>
                  <Menu
                    anchorEl={menuAnchor}
                    open={isMenuOpen}
                    onClose={handleMenuClose}
                    anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                    transformOrigin={{ vertical: "top", horizontal: "left" }}
                  >
                    <MenuItem onClick={handleMenuClose}>
                      <ListItemIcon>
                        <PictureAsPdfIcon style={{ color: "red" }} />
                      </ListItemIcon>
                      <Typography variant="inherit" noWrap>
                        Download in <strong>.pdf</strong> format
                      </Typography>
                    </MenuItem>
                    <MenuItem onClick={handleMenuClose}>
                      <ListItemIcon>
                        <DescriptionIcon style={{ color: "blue" }} />
                      </ListItemIcon>
                      <Typography variant="inherit" noWrap>
                        Download in <strong>.docx</strong> format
                      </Typography>
                    </MenuItem>
                  </Menu>
                </div> */}
                <Button
                  color="success"
                  className="uploadButton"
                  onClick={handleGoogleDriveUpload}
                >
                  Upload to Google Drive
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
        {/* </Container> */}
      </div>
    </>
  );
};

export default FileUploadEssay;
