const assessmentType = require("../models/assessmentType");


const assessmentController = {

    assessments: async (req, res) => {
       
          const { action } = req.query;


          switch (action) {
            case 'add': {

                try {
                   

                    const data =  req.body;
                    let name = data.title;
                    let type = data.description;
                    let status = 1;
                    // Basic validation
                    if (!name || !type) {
                        return res.status(400).json(
                            {"resourceType": "OperationOutcome",
                            "issue": [
                                {
                                "severity": "error",
                                "code": "required",
                                "details": {
                                    "text": "Name and type are required."
                                }
                                }
                            ]});
                    }

                    // Optional: Check for duplicates
                    const existing = await assessmentType.findOne({ name});
                    if (existing) {
                        return res.status(409).json({
                            resourceType: "OperationOutcome",
                            issue: [
                              {
                                severity: "error",
                                code: "duplicate", // or "business-rule"
                                details: {
                                  text: "Assessment type already exists."
                                }
                              }
                            ]
                          });
                    }

                    // Save new assessment type
                    const newAssessment = new assessmentType({ name, type, status });
                    await newAssessment.save();
                    res.status(200).json({
                        resourceType: "Questionnaire",
                        id: newAssessment._id,  // Or whatever ID your DB uses
                        status: "active",
                        title: newAssessment.name,
                        description: newAssessment.type,
                        item: []  // Add real items if available
                      });
                    } catch (error) {
                    res.status(500).json({
                        "resourceType": "OperationOutcome",
                        "issue": [
                          {
                            "severity": "fatal",
                            "code": "exception",
                            "details": {
                              "text": error
                            }
                          }
                        ]
                      });
                    }
              break;
            }
            case 'update': {
              // Another case
              break;
            }
            default: {
              // Fallback logic
              break;
            }
          }
    
        
      }
    };


module.exports = assessmentController;