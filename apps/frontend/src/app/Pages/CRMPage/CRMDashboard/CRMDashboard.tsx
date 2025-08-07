"use client";
import React, { useState, useEffect } from "react";
import { Col, Container, Dropdown, Row } from 'react-bootstrap'
import AdminDashboardLayout from '../../AdminDashboard/layout'
import "./CRMDashboard.css"
import { BiSolidBellRing } from 'react-icons/bi'
import { TbGraphFilled } from 'react-icons/tb'
import CommonTabs from '@/app/Components/CommonTabs/CommonTabs'
import { CrmDashTabs, getPendingTabs, PracticeTabs, SuportTicketTabs} from './CRMConst'
import axios from "axios";

function CRMDashboard() {
    const [selectedRange1, setSelectedRange1] = useState("All");// graphSelected 
    const [selectedRange2, setSelectedRange2] = useState("30D");// graphSelected 
    const [filter, setFilter] = useState<'30' | '60' | '90'>('30');

    const [pendingVerificationCounts, setPendingVerificationCounts] = useState({
      hospitals: 0,
      groomers: 0,
      breeders: 0,
      sitters: 0,
    });

    useEffect(() => {
      const fetchPendingVerificationCounts = async () => {
        try {
          const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/business/pendingVerifications`, {
            businessType: "all",
            countOnly: "yes",
          });
          const counts = res.data?.counts || {
            hospitals: 0,
            groomers: 0,
            breeders: 0,
            sitters: 0,
          };

          setPendingVerificationCounts(counts);
        } catch (err) {
          console.error("Error fetching pending verification counts", err);
        }
      };
  
      fetchPendingVerificationCounts();
    }, []);
    
    const totalPending =
    pendingVerificationCounts.hospitals +
    pendingVerificationCounts.groomers +
    pendingVerificationCounts.breeders +
    pendingVerificationCounts.sitters;



  return (
    <>
    <AdminDashboardLayout>
        <section>
            <Container fluid>
                <div className="CRMDashBoardData">

                    <div className="CRMDashTopHead">
                        <h2>CRM Dashboard</h2>
                        {/* ✅ Show only if there's any pending count */}
                        {totalPending > 0 && (
                          <span className="red">
                            <BiSolidBellRing /> {totalPending} Practices Awaiting Verification
                          </span>
                        )}
                       
                        <span className='green'><TbGraphFilled/> 5 New Leads</span>
                    </div>

                    <Row>
                        <CommonTabs tabs={CrmDashTabs(filter)} showStatusSelect onFilterChange={setFilter}/>
                    </Row>
                    <Row>
                        <div className="CRMTableMainDiv">
                            <h5>Pending Verifications</h5>
                            <CommonTabs tabs={getPendingTabs(pendingVerificationCounts)} />
                        </div>
                    </Row>
                    <Row>
                        <div className="CRMTableMainDiv">
                            <h5>Practice Activity Overview</h5>
                            <CommonTabs tabs={PracticeTabs} showStatusSelect/>
                        </div>
                    </Row>
                    <Row>
                        <div className="CRMTableMainDiv">
                            <h5>Support Tickets</h5>
                            <CommonTabs tabs={SuportTicketTabs} showStatusSelect/>
                        </div>
                    </Row>


                    <Row>
                        <Col md={6}>

                            <GraphSelected
                                title="Practice Funnel"
                                optionsList={[
                                    ["All", "Hospitals", "Groomers","Breeders","Sitters","Developers"], 
                                    ["30D", "45D", "60D" , "75D", "100D" ]
                                ]}
                                selectCount={2}
                                selectedOption={[selectedRange1, selectedRange2]}
                                onSelect={[setSelectedRange1, setSelectedRange2]}
                                />
                        
                        
                        
                        
                        </Col>

                        <Col md={6}>

                            <GraphSelected
                                title="Pet Parent Funnel"
                                optionsList={[
                                    ["30D", "45D", "60D" , "75D", "100D" ] 
                                ]}
                                selectCount={1}
                                selectedOption={selectedRange2}
                                onSelect={setSelectedRange2}
                                />
                        
                        
                        
                        
                        </Col>
                        
                        
                    </Row>


                    












                </div>


            </Container>
        </section>


    </AdminDashboardLayout>
    </>
  )
}

export default CRMDashboard



// GraphSelectedProps
type GraphSelectedProps = {
  title: string;
  optionsList: [string[]] | [string[], string[]];
  selectCount?: 1 | 2;
  selectedOption: string | [string, string];
  onSelect: ((option: string) => void) | [(option: string) => void, (option: string) => void];
}

export const GraphSelected: React.FC<GraphSelectedProps> = ({
  title,
  optionsList,
  selectCount = 1,
  selectedOption,
  onSelect,
}) => {
  return (
    <div className="GraphSelectDiv mb-2">
      <h5>{title}</h5>
      <div className="BothSelct">
        {/* First Dropdown */}
        <Dropdown className="DaysSelectDiv">
          <Dropdown.Toggle size="sm" variant="light">
            {Array.isArray(selectedOption) ? selectedOption[0] : selectedOption}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {optionsList[0].map((option, index) => (
              <Dropdown.Item key={index} onClick={() => Array.isArray(onSelect) ? onSelect[0](option) : onSelect(option)}>
                {option}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
        {/* Second Dropdown if selectCount === 2 */}
        {selectCount === 2 && optionsList[1] && (
          <Dropdown className="DaysSelectDiv">
            <Dropdown.Toggle size="sm" variant="light">
              {Array.isArray(selectedOption) ? selectedOption[1] : optionsList[1][0]}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {optionsList[1].map((option, index) => (
                <Dropdown.Item key={index} onClick={() => Array.isArray(onSelect) && onSelect[1](option)}>
                  {option}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        )}
      </div>
    </div>
  );
};