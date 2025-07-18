"use client";
import React, { useState } from "react";
import "./CRMBusinessLead.css"
import AdminDashboardLayout from '../../AdminDashboard/layout'
import { Col, Container, Dropdown, Form, Row } from 'react-bootstrap'
import { IoAddCircle, IoFileTrayFull } from 'react-icons/io5'
import Image from 'next/image'
import Link from 'next/link';
import { DashInfoCard } from "@/app/Components/DashCard/DashCard";
import { FaStar, FaUser } from "react-icons/fa6";
import { HiMiniUserPlus } from "react-icons/hi2";
import { AiFillMessage } from "react-icons/ai";
import { GraphSelected } from "../CRMDashboard/CRMDashboard";
import LeadsChart from "@/app/Components/BarGraph/LeadsChart";
import SourceBreakdownChart from "@/app/Components/BarGraph/SourceBreakdownChart";
import BuisnessLeadsTable from "@/app/Components/DataTable/BuisnessLeadsTable";
import { FiSearch } from "react-icons/fi";
import DynamicSelect from "@/app/Components/DynamicSelect/DynamicSelect";
import { TbCloudUpload } from "react-icons/tb";

function CRMBusinessLead() {
    const statusOptions = ['Last 30 Days', 'Last 60 Days', 'Last 90 Days'];
    const [status, setStatus] = useState<string>('Last 30 Days');
    const handleDropdownSelect = (eventKey: string | null) => {
    if (eventKey) setStatus(eventKey);};
    const [selectedRange2, setSelectedRange2] = useState("All");// graphSelected 
    const [addNewLead, setAddNewLead] = useState(false);
    const [bulkUpload, setBulkUpload] = useState(false);
    const [email, setEmail] = useState("")
    const [name, setName] = useState("")
    const [phnumber, setPhnumber] = useState("")
    // type status 
    const typesOptions = ['User Type1', 'User Type2', 'User Type3'];
    const [typestatus, setTypeStatus] = useState<string>('User Type');
    const handleTypeDropdownSelect = (eventKey: string | null) => {
    if (eventKey) setTypeStatus(eventKey);};
    // Source status 
    const sourceOptions = ['Source1', 'Source2', 'Source3'];
    const [sourcestatus, setSourceStatus] = useState<string>('Source');
    const handleSourceDropdownSelect = (eventKey: string | null) => {
    if (eventKey) setSourceStatus(eventKey);};
    // Source status 
    const tblstatusOptions = ['Status1', 'Status2', 'Status3'];
    const [tblstatus, setTblStatus] = useState<string>('Status');
    const handleTblStatusDropdownSelect = (eventKey: string | null) => {
    if (eventKey) setTblStatus(eventKey);};

    // select 
    const [country, setCountry] = useState<string>('');
      const options = [
    { value: 'us', label: '🇺🇸 United States' },
    { value: 'in', label: '🇮🇳 India' },
    { value: 'uk', label: '🇬🇧 United Kingdom' },
  ];

  return (
    <>

    <AdminDashboardLayout>
        {!addNewLead ? (
        <section className='BussinessLeadSec'>
            <Container fluid>
                <div className="BussinesLeadData">

                    <div className="BusinessTopDiv">
                        <div className="leftBusiness">
                            <h2>Business Leads</h2>
                            <span className='green'><Image aria-hidden src="/Images/graph.png" alt="graph" width={20} height={20}/> New Leads</span>
                            <span className='orange'><Image aria-hidden src="/Images/book.png" alt="book" width={20} height={20}/> 4 Upcoming Demos</span>
                        </div>
                        <div className="RightBusiness">
                            <CommonBTN icon={<IoAddCircle size={20}/>} path="#" label="Add New Lead" onClick={() => setAddNewLead(true)}/>
                        </div>
                    </div>

                    <div>
                        <CommonSelectHead handleDropdownSelect={handleDropdownSelect} status={status} statusOptions={statusOptions}/>
                        <div className="BuissnessCards">
                            <DashInfoCard DashIcon={<FaUser/>} UserName="Total Users" CrdNumb="2639" RatioIcon="" RatioText="" RatioCL="Done"/>
                            <DashInfoCard DashIcon={<HiMiniUserPlus/>} UserName="New Signups" CrdNumb="288" RatioIcon="" RatioText="" RatioCL="Error"/>
                            <DashInfoCard DashIcon={<FaStar />} UserName="Daily Active Users" CrdNumb="697" RatioIcon="" RatioText="" RatioCL="Done"/>
                            <DashInfoCard DashIcon={<AiFillMessage/>} UserName="New Support Tickets" CrdNumb="113" RatioIcon="" RatioText="" RatioCL="Done"/>

                        </div>
                    </div>

                    <Row>
                        <Col md={6}>

                            <GraphSelected
                                title="New Leads Over Time"
                                optionsList={[
                                    ["30D", "45D", "60D" , "75D", "100D" ] 
                                ]}
                                selectCount={1}
                                selectedOption={selectedRange2}
                                onSelect={setSelectedRange2}
                            />

                            <LeadsChart/>
                        
                        
                        
                        </Col>
                        <Col md={6}>

                            <GraphSelected
                                title="Lead Source Breakdown"
                                optionsList={[
                                    ["30D", "45D", "60D" , "75D", "100D" ] 
                                ]}
                                selectCount={1}
                                selectedOption={selectedRange2}
                                onSelect={setSelectedRange2}
                            />

                            <SourceBreakdownChart/>
                        
                        
                        
                        </Col>

                    </Row>

                    <Row>
                        <div className="businessLeadDiv">
                            <div className="buissnesHead">
                                <h5>Business Leads</h5>
                            </div>
                            <div className="TableBlankSelect">
                                <div className="lftSpace"></div>
                                <div className="RightSpace">
                                    <div className="srch">
                                        <input type="search" placeholder="Search" />
                                        <FiSearch />
                                    </div>
                                    <div className="SpaceDropdown">
                                        <Dropdown onSelect={handleTypeDropdownSelect}>
                                        <Dropdown.Toggle className="custom-status-dropdown" id="dropdown-status">
                                            {typestatus}
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu>
                                            {typesOptions.map((opt) => (
                                            <Dropdown.Item eventKey={opt} key={opt} active={typestatus === opt}>
                                                {opt}
                                            </Dropdown.Item>
                                            ))}
                                        </Dropdown.Menu>
                                        </Dropdown>
                                    </div>
                                    <div className="SpaceDropdown">
                                        <Dropdown onSelect={handleSourceDropdownSelect}>
                                        <Dropdown.Toggle className="custom-status-dropdown" id="dropdown-status">
                                            {sourcestatus}
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu>
                                            {sourceOptions.map((opt) => (
                                            <Dropdown.Item eventKey={opt} key={opt} active={sourcestatus === opt}>
                                                {opt}
                                            </Dropdown.Item>
                                            ))}
                                        </Dropdown.Menu>
                                        </Dropdown>
                                    </div>
                                    <div className="SpaceDropdown">
                                        <Dropdown onSelect={handleTblStatusDropdownSelect}>
                                        <Dropdown.Toggle className="custom-status-dropdown" id="dropdown-status">
                                            {tblstatus}
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu>
                                            {tblstatusOptions.map((opt) => (
                                            <Dropdown.Item eventKey={opt} key={opt} active={tblstatus === opt}>
                                                {opt}
                                            </Dropdown.Item>
                                            ))}
                                        </Dropdown.Menu>
                                        </Dropdown>
                                    </div>
                                </div>
                            </div>
                            <BuisnessLeadsTable/>
                        </div>
                    </Row>

                </div>
            </Container>
        </section>
        ) : (  
        <div className="AddNewLeadDiv">
            {!bulkUpload ? (
            <div className="AdnewFormDiv">
                <div className="Adnewbusines">
                    <h4>Add New Lead</h4>
                    <Link href="#" onClick={() => setBulkUpload(true)}> <IoFileTrayFull size={20}/>  Bulk Upload</Link>
                </div>
                <div className="BusinessNew">
                    <Form>
                        <DynamicSelect options={options} value={country} onChange={setCountry} inname="country" placeholder="User Type"/>
                        <DynamicSelect options={options} value={country} onChange={setCountry} inname="country" placeholder="Lead Source"/>
                        <FormInput readonly={false} intype="email" inname="email" value={email} inlabel="Email Address" onChange={(e) => setEmail(e.target.value)} />
                        <FormInput readonly={false} intype="number" inname="phnumber" value={phnumber} inlabel="Phone Number (optional)" onChange={(e) => setPhnumber(e.target.value)} />
                        
                        <DynamicSelect options={options} value={country} onChange={setCountry} inname="country" placeholder="Country"/>
                        <DynamicSelect options={options} value={country} onChange={setCountry} inname="country" placeholder="City"/>
                        <FormInput readonly={false} intype="text" inname="name" value={name} inlabel="Name (optional)" onChange={(e) => setName(e.target.value)} />
                        <FormInput readonly={false} intype="text" inname="name" value={name} inlabel="Practice Name (optional)" onChange={(e) => setName(e.target.value)} />
                    </Form>
                </div>
                <div className="BusinessAddFooter">
                    <Link className="unfill" href="#"> Cancel</Link>
                    <Link className="fill" href="#"><IoAddCircle size={20} /> Add New Lead</Link>
                </div>
            </div>
            ) : (
            <div className="BussinessBulkUpload">
                <div className="BulkUplodeDiv">
                    <div className="UplodeTexted">
                        <h3>Bulk Upload Business Leads</h3>
                        <p>Easily add or update multiple business leads using a CSV file. <br /> <span>Download the sample CSV</span> to get started.</p>
                    </div>
                    <div className="uplodeFile">
                        <input type="file" id="img" name="img" accept="image/*"/>
                        <div className="uplodeInner">
                            <TbCloudUpload size={40}/>
                            <h6>Upload the CSV with your lead details</h6>
                            <p>Max size supported 20 MB</p>

                        </div>
                    </div>
                </div>
                <div className="BusinessAddFooter">
                    <Link className="unfill" href="#"> Cancel</Link>
                    <Link className="fill" href="#">Upload CSV</Link>
                </div>
            </div>
            )}
        </div>
        )}
    </AdminDashboardLayout>

    </>
  )
}

export default CRMBusinessLead

// CommonBTNProps Started
interface CommonBTNProps {
  path: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}
export function CommonBTN({ path, label, icon , onClick }: CommonBTNProps) {
  return (
    <div className="CommonBtn">
      <Link href={path} onClick={e => { e.preventDefault(); onClick && onClick(); }}>{icon} {label} </Link>
    </div>
  );
}
// CommonBTNProps Ended

// CommonSelectHeadProps
interface CommonSelectHeadProps {
    handleDropdownSelect: (eventKey: string | null) => void;
    status: string;
    statusOptions: string[];
    title?: React.ReactNode;
}
export function CommonSelectHead({
    handleDropdownSelect,
    status,
    statusOptions,
    title,
}: CommonSelectHeadProps) {
    return (
        <div className="CommonSelectHead">
            <h4 style={{ visibility: title ? "visible" : "hidden" }}>
                {title || "placeholder"}
            </h4>
            <div className="ComonSelectStatus">
                <Dropdown onSelect={handleDropdownSelect}>
                    <Dropdown.Toggle className="custom-status-dropdown" id="dropdown-status">
                        {status}
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                        {statusOptions.map((opt) => (
                            <Dropdown.Item eventKey={opt} key={opt} active={status === opt}>
                                {opt}
                            </Dropdown.Item>
                        ))}
                    </Dropdown.Menu>
                </Dropdown>
            </div>
        </div>
    );
}


// FormInputProps started
type FormInputProps = {
  intype: string;
  inname: string;
  value: string;
  inlabel: string;
  readonly?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};
export function FormInput({
  intype,
  inname,
  inlabel,
  value,
  onChange,
  readonly
}: FormInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className={`SignInput floating-input ${isFocused || value ? "focused" : ""}`}
    >
      <input
        type={intype}
        name={inname}
        id={inname}
        value={value}
        onChange={onChange}
        autoComplete="off"
        readOnly={readonly}
        required
        placeholder=" " // <-- Add a single space as placeholder
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      <label htmlFor={inname}>{inlabel}</label>
    </div>
  );
}
// FormInputProps Ended